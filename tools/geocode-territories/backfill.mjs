// One-time territory geocoder backfill (local dev tool).
//
// Runs a free-first waterfall to attach a cached `geo` coordinate to each
// territory in the local Firestore emulator:
//   resolve mapsLink -> coords-from-url
//     -> Nominatim(CEP) -> Nominatim(clean resolved address) -> Nominatim(stored address + city)
//     -> (optional) Google Geocoding  [only when GOOGLE_MAPS_API_KEY is set]
//     -> failed
//
// Never commits or reads the real seed. Never hard-codes an API key - the Google
// key is read from the environment only. See README.md for usage + flags.

import admin from '/Users/matheus/dev/kingdom-apps/functions/ministry-maps/node_modules/firebase-admin/lib/index.js';

// --- Emulator connection ---------------------------------------------------
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8081';
admin.initializeApp({ projectId: 'du-ministry-maps' });
const db = admin.firestore();

// --- Flags -----------------------------------------------------------------
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY_MISSING = args.includes('--only-missing');
const limitFlagIdx = args.findIndex((a) => a === '--limit');
const LIMIT = limitFlagIdx >= 0 ? Number(args[limitFlagIdx + 1]) : null;
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || null;

// --- Config ----------------------------------------------------------------
const UA_BOT = 'curl/8.4.0';                               // resolving Google short links
const UA_GEOCODER = 'kingdom-apps-territory-geocoder/0.1'; // Nominatim/Google politeness UA
const MIN_GAP_MS = 1100;                                   // >= 1.1s between Nominatim/Google calls

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Shared throttle: ensure >= MIN_GAP_MS between any two geocoding-provider calls.
let lastGeoCallAt = 0;
async function throttleGeoCall() {
  const wait = MIN_GAP_MS - (Date.now() - lastGeoCallAt);
  if (wait > 0) await sleep(wait);
  lastGeoCallAt = Date.now();
}

// --- Region guard (matches the validated spike: lat[-24,-21] / lng[-48,-46]) ---
// Rejects the constant Google viewport-center (-22.742162,-47.284224) that leaks
// into non-place pages, and clamps to the tri-city bounding box.
const VIEWPORT_CENTER = { lat: -22.742162, lng: -47.284224 };
const BBOX = { latMin: -24, latMax: -21, lngMin: -48, lngMax: -46 };
function isInRegion(c) {
  if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return false;
  const near =
    Math.abs(c.lat - VIEWPORT_CENTER.lat) < 1e-3 &&
    Math.abs(c.lng - VIEWPORT_CENTER.lng) < 1e-3;
  return (
    !near &&
    c.lat > BBOX.latMin && c.lat < BBOX.latMax &&
    c.lng > BBOX.lngMin && c.lng < BBOX.lngMax
  );
}

// --- Parse helpers (inline copy of geocode-parse.ts - .mjs can't import the TS) ---
function coordsFromUrl(u) {
  const at = u.match(/@(-?\d{1,2}\.\d{4,}),(-?\d{1,3}\.\d{4,})/);
  if (at) return { lat: +at[1], lng: +at[2] };
  const bang = u.match(/!3d(-?\d{1,2}\.\d{4,})!4d(-?\d{1,3}\.\d{4,})/);
  if (bang) return { lat: +bang[1], lng: +bang[2] };
  return null;
}
function cleanAddrFromUrl(u) {
  const m = u.match(/\/place\/([^/@]+)/);
  if (!m) return null;
  let s = m[1];
  for (let i = 0; i < 2; i++) {
    try { s = decodeURIComponent(s); } catch { break; }
  }
  return s.replace(/\+/g, ' ').trim() || null;
}
const cepOf = (s) => (s ? (String(s).match(/\b\d{5}-?\d{3}\b/) || [null])[0] : null);

// --- Providers -------------------------------------------------------------
async function nominatim(q) {
  await throttleGeoCall();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA_GEOCODER } });
  const arr = await res.json().catch(() => []);
  if (Array.isArray(arr) && arr.length) return { lat: +arr[0].lat, lng: +arr[0].lon };
  return null;
}

async function googleGeocode(address) {
  if (!GOOGLE_KEY || !address) return null;
  await throttleGeoCall();
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=br&key=${GOOGLE_KEY}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA_GEOCODER } });
  const body = await res.json().catch(() => null);
  const loc = body?.results?.[0]?.geometry?.location;
  if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
    return { lat: loc.lat, lng: loc.lng };
  }
  return null;
}

// method -> geoStatus: 'ok' for url/google, 'approx' for nominatim (cep/clean/stored), 'failed' otherwise.
function statusFor(method) {
  if (method === 'url' || method === 'google') return 'ok';
  if (method === 'cep' || method === 'clean-addr' || method === 'stored-addr') return 'approx';
  return 'failed';
}

// --- Waterfall for a single territory --------------------------------------
async function locate(t) {
  const storedAddr = (t.address || '').replace(/\t/g, ' ').trim();
  const city = t.city || '';
  let coords = null;
  let method = 'failed';
  let cleanAddr = null;

  // 1) Resolve mapsLink and read coords straight off the resolved URL.
  const rawLink = t.mapsLink && String(t.mapsLink).trim();
  if (rawLink) {
    const link = rawLink.match(/https?:\/\/\S+/)?.[0] ?? rawLink;
    try {
      const res = await fetch(link, { redirect: 'follow', headers: { 'User-Agent': UA_BOT, 'Accept-Language': 'en' } });
      const finalUrl = res.url;
      cleanAddr = cleanAddrFromUrl(finalUrl);
      const urlCoords = coordsFromUrl(finalUrl);
      if (isInRegion(urlCoords)) { coords = urlCoords; method = 'url'; }
    } catch (e) {
      // network/redirect failure - fall through to address-based lookups
    }
  }

  // 2) Nominatim(CEP) -> Nominatim(clean resolved address) -> Nominatim(stored address + city)
  if (!coords) {
    const cep = cepOf(cleanAddr) || cepOf(storedAddr);
    if (cep) {
      const c = await nominatim(`${cep}, Brasil`);
      if (isInRegion(c)) { coords = c; method = 'cep'; }
    }
  }
  if (!coords && cleanAddr) {
    const c = await nominatim(cleanAddr);
    if (isInRegion(c)) { coords = c; method = 'clean-addr'; }
  }
  if (!coords && (storedAddr || city)) {
    const c = await nominatim(`${storedAddr}, ${city}, SP`);
    if (isInRegion(c)) { coords = c; method = 'stored-addr'; }
  }

  // 3) Google fallback (only when a key is present in the environment).
  if (!coords && GOOGLE_KEY) {
    const address = cleanAddr || (storedAddr ? `${storedAddr}, ${city}, SP` : null);
    const c = await googleGeocode(address);
    if (isInRegion(c)) { coords = c; method = 'google'; }
  }

  return { coords, method, cleanAddr, storedAddr };
}

// --- Main ------------------------------------------------------------------
async function main() {
  const snap = await db.collection('territories').get();
  let docs = snap.docs;
  if (ONLY_MISSING) docs = docs.filter((d) => d.data().geo == null);
  if (LIMIT && LIMIT > 0) docs = docs.slice(0, LIMIT);

  const counts = { url: 0, cep: 0, 'clean-addr': 0, 'stored-addr': 0, google: 0, failed: 0 };
  let located = 0;

  console.log(
    `Geocoding ${docs.length} territories | dry-run=${DRY_RUN} only-missing=${ONLY_MISSING} google=${GOOGLE_KEY ? 'on' : 'off'}${LIMIT ? ` limit=${LIMIT}` : ''}`
  );

  for (const d of docs) {
    const t = d.data();
    const { coords, method, cleanAddr, storedAddr } = await locate(t);
    const status = statusFor(method);
    const good = status !== 'failed';
    if (good) located++;
    counts[method] = (counts[method] || 0) + 1;

    const label = (t.note || storedAddr || d.id).split('\n')[0].slice(0, 14).padEnd(14);
    const coordStr = coords ? `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}` : '(none)';
    console.log(
      `${good ? 'OK ' : 'XX '} ${label} ${method.padEnd(12)} ${status.padEnd(7)} ${coordStr.padEnd(20)} | ${(cleanAddr || storedAddr).slice(0, 44)}`
    );

    if (!DRY_RUN) {
      const update = { geoStatus: status, geocodedAt: admin.firestore.Timestamp.now() };
      if (coords) update.geo = new admin.firestore.GeoPoint(coords.lat, coords.lng);
      await d.ref.set(update, { merge: true });
    }
  }

  const breakdown = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}:${n}`)
    .join(' ');
  console.log(
    `\n=== ${located}/${docs.length} located | failed:${counts.failed} | ${breakdown} ===` +
    (DRY_RUN ? ' (dry-run: no writes)' : ' (written)')
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

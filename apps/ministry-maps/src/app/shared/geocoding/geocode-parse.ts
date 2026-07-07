export interface LatLng { lat: number; lng: number; }

// Google's constant viewport-center that leaks into non-place pages - never a real pin.
const VIEWPORT_CENTER: LatLng = { lat: -22.742162, lng: -47.284224 };
// Bounding box around Americana / Santa Bárbara d'Oeste / Nova Odessa (tri-city cluster ~lat -22.7).
// latMin is held at -23 so points as far south as São Paulo city (lat ~-23.55) fall outside the region.
const BBOX = { latMin: -23, latMax: -21, lngMin: -48, lngMax: -46 };

export function isInRegion(c: LatLng | null): c is LatLng {
  if (!c) return false;
  const near =
    Math.abs(c.lat - VIEWPORT_CENTER.lat) < 1e-3 &&
    Math.abs(c.lng - VIEWPORT_CENTER.lng) < 1e-3;
  return !near &&
    c.lat > BBOX.latMin && c.lat < BBOX.latMax &&
    c.lng > BBOX.lngMin && c.lng < BBOX.lngMax;
}

/** Extract lat/lng from a resolved Google Maps URL (@lat,lng or !3d..!4d..). */
export function coordsFromResolvedUrl(url: string): LatLng | null {
  const at = url.match(/@(-?\d{1,2}\.\d{4,}),(-?\d{1,3}\.\d{4,})/);
  if (at) return { lat: +at[1], lng: +at[2] };
  const bang = url.match(/!3d(-?\d{1,2}\.\d{4,})!4d(-?\d{1,3}\.\d{4,})/);
  if (bang) return { lat: +bang[1], lng: +bang[2] };
  return null;
}

/** Pull the clean /maps/place/<address>/ segment (double-decoded) from a resolved URL. */
export function cleanAddressFromUrl(url: string): string | null {
  const m = url.match(/\/place\/([^/@]+)/);
  if (!m) return null;
  let s = m[1];
  for (let i = 0; i < 2; i++) { try { s = decodeURIComponent(s); } catch { break; } }
  return s.replace(/\+/g, ' ').trim() || null;
}

/** Brazilian postal code (CEP) e.g. 13460-000. */
export function cepFromText(s: string | undefined | null): string | null {
  if (!s) return null;
  const m = s.match(/\b\d{5}-?\d{3}\b/);
  return m ? m[0] : null;
}

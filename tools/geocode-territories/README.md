# Territory geocoder backfill

One-time local dev tool that attaches a cached `geo` coordinate to every territory
in the **local Firestore emulator**. It runs a free-first waterfall and only falls
back to the paid Google Geocoding API for the misses.

## Waterfall

For each territory, in order, stopping at the first in-region hit:

1. **Resolve `mapsLink`** (follow redirects) and read coords straight off the
   resolved Google Maps URL (`@lat,lng` or `!3d..!4d..`) → `geoStatus: ok`.
2. **Nominatim (OpenStreetMap)** on the CEP parsed from the resolved/stored address → `geoStatus: approx`.
3. **Nominatim** on the clean `/place/...` address from the resolved URL → `geoStatus: approx`.
4. **Nominatim** on the stored `address + city + SP` → `geoStatus: approx`.
5. **Google Geocoding** on the clean/stored address — **only when `GOOGLE_MAPS_API_KEY`
   is set** → `geoStatus: ok`.
6. Otherwise → `geoStatus: failed` (no `geo` written; retried on the next `--only-missing` run).

Every candidate is passed through a region guard that rejects Google's constant
viewport-center pin (`-22.742162,-47.284224`) and clamps to the tri-city bounding
box (`lat -24..-21 / lng -48..-46`), so out-of-region hits never get stored.

## Usage

The emulator must be running with the seed loaded (Firestore on `127.0.0.1:8081`).

```bash
# Dry run — free-only, no writes, prints per-territory method + a summary line.
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 node tools/geocode-territories/backfill.mjs --dry-run --limit 30

# Full backfill of the not-yet-geocoded territories, with Google fallback for the ~50% Nominatim misses.
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 GOOGLE_MAPS_API_KEY=... node tools/geocode-territories/backfill.mjs --only-missing
```

## Flags

| Flag | Effect |
| --- | --- |
| `--dry-run` | Never writes. Prints the resolved method per territory and a final summary (located/failed counts + method breakdown). |
| `--limit N` | Only process the first `N` territories. |
| `--only-missing` | Skip territories that already have a `geo` coordinate (also re-tries prior `failed` ones, which have no `geo`). |

## Writes (non-dry-run)

Each located territory gets, via a merge write:

- `geo` — a Firestore `GeoPoint(lat, lng)`.
- `geoStatus` — `'ok'` (url/Google), `'approx'` (Nominatim/CEP), or `'failed'`.
- `geocodedAt` — a Firestore `Timestamp`.

## Notes

- **Firebase Admin** is loaded from the main tree's `functions/ministry-maps` install
  (worktrees don't have their own `functions/node_modules`).
- **Politeness:** ≥1.1s between any two Nominatim/Google calls; User-Agent
  `kingdom-apps-territory-geocoder/0.1`.
- **The Google API key is never committed.** Read it from the environment only — it
  lives in the `~/dev/matinhoviagens` env. Pass it inline as `GOOGLE_MAPS_API_KEY=...`
  when running the paid fallback; without it the script stays 100% free.
- This is a one-time backfill against the **local emulator seed** — it does not touch
  production and it never commits the seed (PII).

export interface GeoPointLike {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres between two lat/lng points. */
export function haversineKm(a: GeoPointLike, b: GeoPointLike): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Full symmetric N×N straight-line distance matrix (km). */
export function buildHaversineMatrix(points: GeoPointLike[]): number[][] {
  return points.map(from => points.map(to => haversineKm(from, to)));
}

import { GeoPointLike, haversineKm } from './haversine';

export interface TeamRoute<T> {
  /** 0-based team number, in route order. */
  pairIndex: number;
  /** false for the car-less teams (assigned the shortest sub-routes). */
  hasCar: boolean;
  /** this team's territories, in route order (a contiguous slice of `ordered`). */
  items: T[];
  /** intra-team straight-line travel in km (sum of consecutive legs), rounded to 0.1. */
  totalKm: number;
  /** visitMin*count + travel minutes, rounded. */
  estMinutes: number;
}

export interface SplitOptions {
  pairs: number;
  cars: number;
  visitMin?: number;
  avgKmh?: number;
}

export interface SplitResult<T> {
  teams: TeamRoute<T>[];
  requestedPairs: number;
  effectivePairs: number;
}

/**
 * Splits an already-optimized route into K balanced, car-aware team sub-routes.
 *
 * The split is a contiguous linear partition minimizing the sum of squared per-team
 * workloads (variance-minimizing), so teams get balanced, geographically tight slices
 * of the proximity-ordered route. When cars < teams, the (teams - cars) shortest
 * sub-routes are handed to the car-less teams.
 *
 * `ordered` must be territories already in optimized order, each with a `geo` point.
 */
export function splitRouteIntoTeams<T extends { geo?: GeoPointLike }>(
  ordered: T[],
  options: SplitOptions
): SplitResult<T> {
  const visitMin = options.visitMin ?? 10;
  const avgKmh = options.avgKmh ?? 30;
  const n = ordered.length;

  if (n === 0) {
    return { teams: [], requestedPairs: options.pairs, effectivePairs: 0 };
  }

  const K = Math.min(Math.max(1, Math.floor(options.pairs) || 1), n);

  // leg[i] = km from ordered[i-1] to ordered[i]; leg[0] = 0
  const leg = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    leg[i] = haversineKm(ordered[i - 1].geo as GeoPointLike, ordered[i].geo as GeoPointLike);
  }
  // Prefix of legs so a segment's INTERNAL travel can be summed in O(1).
  // L[i] = leg[0] + ... + leg[i-1].
  const L = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= n; i++) L[i] = L[i - 1] + leg[i - 1];

  // Segment [a, b) workload in minutes: visit time + INTERNAL travel only. The leg that
  // begins a segment is the inter-team hop no team drives, so it is excluded here exactly
  // as it is from the reported totalKm/estMinutes - the DP optimizes the balance it reports.
  const segCost = (a: number, b: number) => visitMin * (b - a) + ((L[b] - L[a + 1]) / avgKmh) * 60;

  // dp[k][i] = min achievable sum of squared segment workloads splitting first i
  // items into k contiguous segments. Squaring penalizes uneven segments, so teams
  // come out balanced rather than leaving one pair with a single stop.
  const INF = Number.POSITIVE_INFINITY;
  const dp: number[][] = Array.from({ length: K + 1 }, () => new Array<number>(n + 1).fill(INF));
  const cut: number[][] = Array.from({ length: K + 1 }, () => new Array<number>(n + 1).fill(0));
  dp[0][0] = 0;
  for (let k = 1; k <= K; k++) {
    for (let i = k; i <= n; i++) {
      for (let j = k - 1; j < i; j++) {
        const seg = segCost(j, i);
        const cost = dp[k - 1][j] + seg * seg;
        if (cost < dp[k][i]) {
          dp[k][i] = cost;
          cut[k][i] = j;
        }
      }
    }
  }

  // Reconstruct the K contiguous segment boundaries.
  const bounds: number[] = [];
  let end = n;
  for (let k = K; k >= 1; k--) {
    bounds.unshift(end);
    end = cut[k][end];
  }

  const teams: TeamRoute<T>[] = [];
  let start = 0;
  for (let k = 0; k < K; k++) {
    const segEnd = bounds[k];
    const items = ordered.slice(start, segEnd);
    let km = 0;
    for (let p = start + 1; p < segEnd; p++) km += leg[p]; // legs strictly inside the segment
    const totalKm = Math.round(km * 10) / 10;
    const estMinutes = Math.round(visitMin * items.length + (totalKm / avgKmh) * 60);
    teams.push({ pairIndex: k, hasCar: true, items, totalKm, estMinutes });
    start = segEnd;
  }

  // Car-aware: car-less teams should get the tightest WALKABLE clusters. Prefer multi-stop
  // segments (a lone stop reports 0 internal km but often hides a long approach drive, so it
  // is the worst pick for a car-less team) then smallest internal distance.
  const carless = Math.max(0, K - Math.max(0, Math.floor(options.cars) || 0));
  if (carless > 0) {
    const ranked = teams
      .map((t, idx) => ({ idx, lone: t.items.length >= 2 ? 0 : 1, km: t.totalKm }))
      .sort((a, b) => a.lone - b.lone || a.km - b.km);
    for (let c = 0; c < carless && c < ranked.length; c++) {
      teams[ranked[c].idx].hasCar = false;
    }
  }

  return { teams, requestedPairs: options.pairs, effectivePairs: K };
}

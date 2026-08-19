import type { TourEndpoint, TourMatrix, SolveTourResult } from './solve-tour';

/**
 * Exact TSP/path solver via Held-Karp dynamic programming.
 *
 * - Start node is always index 0.
 * - 'round_trip' returns to index 0 at the end.
 * - 'open' ends at whichever node minimises total duration.
 * - The objective is total duration; distance is reported for the winning order.
 *
 * Feasible for N <= 15: O(N^2 * 2^N), which stays inside the route-matrix cap
 * without the bad local-search traps that hurt dense walking stop lists.
 */
export function solveExactTour(input: {
  durationMatrix: TourMatrix;
  distanceMatrix: TourMatrix;
  endpoint: TourEndpoint;
}): SolveTourResult {
  const { durationMatrix, distanceMatrix, endpoint } = input;
  const n = durationMatrix.length;

  if (n === 0) {
    return { order: [], totalDuration: 0, totalDistance: 0 };
  }
  if (n === 1) {
    return { order: [0], totalDuration: 0, totalDistance: 0 };
  }

  const stateCount = 1 << n;
  const startMask = 1;
  const fullMask = stateCount - 1;
  const infinity = Number.POSITIVE_INFINITY;
  const dp = Array.from({ length: stateCount }, () => {
    const row = new Float64Array(n);
    row.fill(infinity);
    return row;
  });
  const parent = Array.from({ length: stateCount }, () => {
    const row = new Int16Array(n);
    row.fill(-1);
    return row;
  });

  dp[startMask][0] = 0;

  for (let mask = startMask; mask < stateCount; mask += 1) {
    if ((mask & startMask) === 0) {
      continue;
    }

    for (let last = 0; last < n; last += 1) {
      if ((mask & (1 << last)) === 0) {
        continue;
      }

      const currentCost = dp[mask][last];
      if (!Number.isFinite(currentCost)) {
        continue;
      }

      for (let next = 1; next < n; next += 1) {
        const nextBit = 1 << next;
        if ((mask & nextBit) !== 0) {
          continue;
        }

        const nextMask = mask | nextBit;
        const nextCost = currentCost + durationMatrix[last][next];
        if (nextCost < dp[nextMask][next]) {
          dp[nextMask][next] = nextCost;
          parent[nextMask][next] = last;
        }
      }
    }
  }

  let bestDuration = infinity;
  let bestLast = 0;
  for (let last = 0; last < n; last += 1) {
    let total = dp[fullMask][last];
    if (endpoint === 'round_trip') {
      total += durationMatrix[last][0];
    }

    if (total < bestDuration) {
      bestDuration = total;
      bestLast = last;
    }
  }

  const order = reconstructOrder(parent, fullMask, bestLast);

  return {
    order,
    totalDuration: Number.isFinite(bestDuration) ? bestDuration : 0,
    totalDistance: tourCost(order, distanceMatrix, endpoint),
  };
}

function reconstructOrder(
  parent: Int16Array[],
  initialMask: number,
  initialLast: number,
): number[] {
  const order: number[] = [];
  let mask = initialMask;
  let last = initialLast;

  while (last >= 0) {
    order.push(last);
    const previous = parent[mask][last];
    mask ^= 1 << last;
    last = previous;
  }

  order.reverse();
  return order;
}

function tourCost(
  order: number[],
  matrix: TourMatrix,
  endpoint: TourEndpoint,
): number {
  if (order.length < 2) {
    return 0;
  }

  let cost = 0;
  for (let i = 0; i < order.length - 1; i += 1) {
    cost += matrix[order[i]][order[i + 1]];
  }

  if (endpoint === 'round_trip') {
    cost += matrix[order[order.length - 1]][order[0]];
  }

  return cost;
}

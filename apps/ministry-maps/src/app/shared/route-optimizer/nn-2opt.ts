import type { TourEndpoint, TourMatrix, SolveTourResult } from './solve-tour';

/**
 * Nearest-neighbor seed followed by 2-opt local search.
 *
 * - Start node is fixed at index 0.
 * - 'round_trip' returns to index 0; 'open' terminates wherever yields
 *   the lowest total duration.
 * - The 2-opt loop is capped at N^2 iterations to bound runtime.
 *
 * Intended for 10 < N <= 15 where exact TSP is too slow.
 */
export function solveNearestNeighborTwoOpt(input: {
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

  const seed = nearestNeighborSeed(durationMatrix);
  const optimized = twoOpt(seed, durationMatrix, endpoint);

  const totalDuration = tourCost(optimized, durationMatrix, endpoint);
  const totalDistance = tourCost(optimized, distanceMatrix, endpoint);

  return {
    order: optimized,
    totalDuration,
    totalDistance,
  };
}

function nearestNeighborSeed(matrix: TourMatrix): number[] {
  const n = matrix.length;
  const order = [0];
  const visited = new Array<boolean>(n).fill(false);
  visited[0] = true;

  for (let step = 1; step < n; step += 1) {
    const current = order[order.length - 1];
    let bestIndex = -1;
    let bestCost = Number.POSITIVE_INFINITY;
    for (let j = 0; j < n; j += 1) {
      if (visited[j]) continue;
      const cost = matrix[current][j];
      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = j;
      }
    }
    if (bestIndex < 0) break;
    visited[bestIndex] = true;
    order.push(bestIndex);
  }

  return order;
}

function twoOpt(
  initial: number[],
  matrix: TourMatrix,
  endpoint: TourEndpoint,
): number[] {
  const n = initial.length;
  if (n < 4) return initial.slice();

  let best = initial.slice();
  let bestCost = tourCost(best, matrix, endpoint);
  const iterationCap = n * n;
  let iterations = 0;
  let improved = true;

  while (improved && iterations < iterationCap) {
    improved = false;

    // Indices 1..n-1 are reorderable; start (index 0) is pinned.
    // For round_trip, the closing edge is best[n-1] -> best[0]; reversing
    // segment [i..k] for any 1 <= i < k <= n-1 keeps the start pinned.
    // For open, the same range applies; the trailing edge is just dropped
    // from the cost.
    for (let i = 1; i < n - 1; i += 1) {
      for (let k = i + 1; k < n; k += 1) {
        iterations += 1;
        if (iterations > iterationCap) break;

        const candidate = twoOptSwap(best, i, k);
        const candidateCost = tourCost(candidate, matrix, endpoint);
        if (candidateCost + 1e-9 < bestCost) {
          best = candidate;
          bestCost = candidateCost;
          improved = true;
        }
      }
      if (iterations > iterationCap) break;
    }
  }

  return best;
}

function twoOptSwap(order: number[], i: number, k: number): number[] {
  const next = order.slice(0, i);
  for (let j = k; j >= i; j -= 1) next.push(order[j]);
  for (let j = k + 1; j < order.length; j += 1) next.push(order[j]);
  return next;
}

function tourCost(
  order: number[],
  matrix: TourMatrix,
  endpoint: TourEndpoint,
): number {
  if (order.length < 2) return 0;
  let cost = 0;
  for (let i = 0; i < order.length - 1; i += 1) {
    cost += matrix[order[i]][order[i + 1]];
  }
  if (endpoint === 'round_trip') {
    cost += matrix[order[order.length - 1]][order[0]];
  }
  return cost;
}

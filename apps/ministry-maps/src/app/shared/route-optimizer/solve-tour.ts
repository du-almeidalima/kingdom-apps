import { solveExactTour } from './exact-tsp';

export type TourEndpoint = 'round_trip' | 'open';

export type TourMatrix = number[][];

export interface SolveTourInput {
  durationMatrix: TourMatrix;
  distanceMatrix: TourMatrix;
  endpoint: TourEndpoint;
}

export interface SolveTourResult {
  order: number[];
  totalDuration: number;
  totalDistance: number;
}

export const EXACT_TSP_MAX_N = 15;
export const HEURISTIC_MAX_N = 15;

export class StepCapExceededError extends Error {
  constructor(readonly n: number, readonly cap = HEURISTIC_MAX_N) {
    super(`Step cap exceeded: ${n} > ${cap}`);
    this.name = 'StepCapExceededError';
  }
}

/**
 * Dispatch entry point: use exact dynamic-programming TSP within the API cap. Throws
 * {@link StepCapExceededError} for N > HEURISTIC_MAX_N so the caller can
 * map it to `step_cap_exceeded` without ever touching the matrix API.
 */
export function solveTour(input: SolveTourInput): SolveTourResult {
  const { durationMatrix, distanceMatrix, endpoint } = input;
  const n = durationMatrix.length;

  if (distanceMatrix.length !== n) {
    throw new Error(
      `solveTour: duration/distance matrix size mismatch (${n} vs ${distanceMatrix.length})`,
    );
  }

  if (n > HEURISTIC_MAX_N) {
    throw new StepCapExceededError(n);
  }

  return solveExactTour({ durationMatrix, distanceMatrix, endpoint });
}

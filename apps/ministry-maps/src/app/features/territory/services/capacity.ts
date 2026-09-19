// Preaching-day capacity estimator.
const DEFAULT_VISIT_MIN = 10; // avg time at one household (talk/notes)
const DEFAULT_AVG_KMH = 30; // avg urban driving speed across the tri-city area

export interface CapacitySuggestion {
  perPair: number; // territories one pair can cover within the budget (>=1)
  suggestedTotal: number; // perPair * pairs
}

export function suggestCapacity(input: {
  pairs: number;
  durationMin: number; // time budget for the session (e.g. 120 for 2h)
  avgLegKm: number; // average straight-line distance between consecutive stops on the current route (0 if unknown)
  visitMin?: number; // default 10
  avgKmh?: number; // default 30
}): CapacitySuggestion {
  const { pairs, durationMin, avgLegKm } = input;
  const visitMin = input.visitMin ?? DEFAULT_VISIT_MIN;
  const avgKmh = input.avgKmh ?? DEFAULT_AVG_KMH;

  if (durationMin <= 0 || pairs <= 0) {
    return { perPair: 0, suggestedTotal: 0 };
  }

  const legMin = avgLegKm > 0 ? (avgLegKm / avgKmh) * 60 : 0;
  const minutesPerStop = visitMin + legMin;

  const perPair =
    minutesPerStop <= 0 ? 1 : Math.max(1, Math.floor(durationMin / minutesPerStop));
  const suggestedTotal = perPair * pairs;

  return { perPair, suggestedTotal };
}

export type SelectionStatus = 'under' | 'ok' | 'over';

export function selectionStatus(selected: number, suggestedTotal: number): SelectionStatus {
  if (Math.abs(selected - suggestedTotal) <= 1) {
    return 'ok';
  }
  return selected < suggestedTotal ? 'under' : 'over';
}

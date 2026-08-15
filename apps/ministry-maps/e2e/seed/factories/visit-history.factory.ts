import { randomUUID } from 'crypto';

import { VisitOutcomeEnum } from '../../../src/models/enums/visit-outcome';
import { TerritoryVisitHistory } from '../../../src/models/territory-visit-history';

/** Base timestamp for default visit-history dates (2024-01-15T10:00:00.000Z). */
const BASE_DATE_MS = Date.UTC(2024, 0, 15, 10);
const ONE_DAY_MS = 86_400_000;

/** Counts default builds so each gets a distinct, decreasing date. */
let defaultDateSequence = 0;

/**
 * Builds a single visit-history entry. `date` is a plain `Date` (the Admin SDK
 * persists it as a Firestore `Timestamp`). Successive calls without a `date`
 * override get distinct, decreasing dates so default builds never collide and
 * sort deterministically.
 */
export function buildVisitHistory(
  over: Partial<TerritoryVisitHistory> = {},
): TerritoryVisitHistory {
  return {
    id: `visit-${randomUUID()}`,
    notes: 'Morador atendeu e demonstrou interesse.',
    isRevisit: false,
    isResolved: true,
    name: 'Maria',
    date: new Date(BASE_DATE_MS - defaultDateSequence++ * ONE_DAY_MS),
    visitOutcome: VisitOutcomeEnum.SPOKE,
    ...over,
  };
}

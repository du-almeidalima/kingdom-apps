import { randomUUID } from 'crypto';

import { VisitOutcomeEnum } from '../../../src/models/enums/visit-outcome';
import { TerritoryVisitHistory } from '../../../src/models/territory-visit-history';

/**
 * Builds a single visit-history entry. `date` is a plain `Date` (the Admin SDK
 * persists it as a Firestore `Timestamp`).
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
    date: new Date('2024-01-15T10:00:00.000Z'),
    visitOutcome: VisitOutcomeEnum.SPOKE,
    ...over,
  };
}

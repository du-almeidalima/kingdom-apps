import { Timestamp } from 'firebase-admin/firestore';

import { DesignationsHeaderDoc } from '../models/designations-header';
import {
  DesignationProgressEntry,
  DesignationsProgressDoc,
  TerritoryProgressEntry,
  VisitOutcomeEnum,
} from '../models/designations-progress';

type HistoryEntry = { date: Timestamp; visitOutcome: VisitOutcomeEnum };
type DesignationForProgress = {
  id: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  territories: Array<{ id: string; status: string; history?: HistoryEntry[] }>;
};
export type SkippedProgressTerritory = { designationId: string; territoryId: string };
export type BuildDesignationsProgressResult = { progress: DesignationsProgressDoc; skipped: SkippedProgressTerritory[] };

const PROGRESS_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export const buildDesignationsProgress = (
  header: DesignationsHeaderDoc,
  designations: DesignationForProgress[],
): BuildDesignationsProgressResult => {
  const designationEntries: Record<string, DesignationProgressEntry> = {};
  const territoryEntries: Record<string, TerritoryProgressEntry> = {};
  const skipped: SkippedProgressTerritory[] = [];

  for (const designation of designations) {
    const territories = designation.territories ?? [];
    designationEntries[designation.id] = {
      territoriesTotal: territories.length,
      createdAt: designation.createdAt,
      expiresAt: designation.expiresAt,
    };
    for (const territory of territories) {
      if (territory.status !== 'DONE') continue;
      const lastHistory = territory.history?.at(-1);
      if (!lastHistory || lastHistory.visitOutcome === undefined || !lastHistory.date) {
        skipped.push({ designationId: designation.id, territoryId: territory.id });
        continue;
      }
      territoryEntries[`${designation.id}_${territory.id}`] = {
        designationId: designation.id,
        territoryId: territory.id,
        outcome: lastHistory.visitOutcome,
        completedAt: lastHistory.date,
      };
    }
  }

  const fallbackTtl = header.createdAt
    ? new Date(header.createdAt.toDate().getTime() + PROGRESS_TTL_MS)
    : new Date(Date.now() + PROGRESS_TTL_MS);

  return {
    progress: {
      id: 'summary',
      headerId: header.id,
      congregationId: header.congregationId,
      expireAt: header.expireAt ?? Timestamp.fromDate(fallbackTtl),
      designations: designationEntries,
      territories: territoryEntries,
    },
    skipped,
  };
};

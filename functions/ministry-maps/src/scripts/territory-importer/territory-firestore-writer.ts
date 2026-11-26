import type { Firestore } from 'firebase-admin/firestore';

import { PlannedTerritoryWrite } from './territory-import.model';

/** Each territory takes up to 2 writes (territory + history); 200 items <= 400 writes < Firestore's 500 batch limit. */
const MAX_TERRITORIES_PER_BATCH = 200;

export type TerritoryImportWriteStats = {
  territoriesWritten: number;
  historyDocsWritten: number;
  batchesCommitted: number;
};

export const writeImportedTerritories = async (
  db: Firestore,
  plan: readonly PlannedTerritoryWrite[],
  options: { dryRun?: boolean } = {},
): Promise<TerritoryImportWriteStats> => {
  const dryRun = options.dryRun ?? false;
  const stats: TerritoryImportWriteStats = {
    territoriesWritten: 0,
    historyDocsWritten: 0,
    batchesCommitted: 0,
  };

  for (let offset = 0; offset < plan.length; offset += MAX_TERRITORIES_PER_BATCH) {
    const chunk = plan.slice(offset, offset + MAX_TERRITORIES_PER_BATCH);
    const batch = db.batch();

    for (const item of chunk) {
      const territoryRef = db.collection('territories').doc(item.territory.id);
      stats.territoriesWritten++;

      if (!dryRun) {
        batch.set(territoryRef, item.territory);
      }

      if (item.history) {
        stats.historyDocsWritten++;
        if (!dryRun) {
          const historyRef = territoryRef.collection('history').doc(item.history.id);
          batch.set(historyRef, item.history);
        }
      }
    }

    if (!dryRun && chunk.length > 0) {
      await batch.commit();
      stats.batchesCommitted++;
    }
  }

  return stats;
};

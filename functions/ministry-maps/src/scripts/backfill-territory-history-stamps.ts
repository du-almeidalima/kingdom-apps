/**
 * One-time backfill that stamps `congregationId` and `territoryId` on existing
 * `/territories/{id}/history` subcollection documents. These stamps let the statistics page
 * resolve every visit of a congregation with a single collection-group query instead of one
 * query per territory.
 *
 *   - Idempotent: only documents whose stamps are missing or different are written.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node lib/scripts/backfill-territory-history-stamps.js [--dry-run]
 *   GOOGLE_APPLICATION_CREDENTIALS=<path> node lib/scripts/backfill-territory-history-stamps.js [--dry-run]
 */

import { FieldPath, QueryDocumentSnapshot, QuerySnapshot } from 'firebase-admin/firestore';
import { db } from '../config/firebase';

const PAGE_SIZE = 100;

const dryRun = process.argv.includes('--dry-run');

if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set FIRESTORE_EMULATOR_HOST (emulator) or GOOGLE_APPLICATION_CREDENTIALS (production).');
  process.exit(1);
}

interface BackfillStats {
  territoriesScanned: number;
  historyDocsScanned: number;
  historyDocsBackfilled: number;
}

async function backfillHistoryStamps(): Promise<BackfillStats> {
  const stats: BackfillStats = {
    territoriesScanned: 0,
    historyDocsScanned: 0,
    historyDocsBackfilled: 0,
  };

  let cursor: QueryDocumentSnapshot | null = null;

  for (;;) {
    const base = db.collection('territories').orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    const snapshot: QuerySnapshot = await (cursor ? base.startAfter(cursor) : base).get();
    if (snapshot.empty) break;

    for (const territoryDoc of snapshot.docs) {
      stats.territoriesScanned++;
      const congregationId = territoryDoc.data()['congregationId'] as string | undefined;
      if (!congregationId) {
        console.warn(`Territory [${territoryDoc.id}] has no congregationId; skipping its history documents.`);
        continue;
      }

      const historySnapshot = await territoryDoc.ref.collection('history').get();
      const stampBatch = db.batch();
      let hasUpdates = false;

      for (const historyDoc of historySnapshot.docs) {
        stats.historyDocsScanned++;
        const data = historyDoc.data();

        const needsCongregationId = data['congregationId'] !== congregationId;
        const needsTerritoryId = data['territoryId'] !== territoryDoc.id;

        if (needsCongregationId || needsTerritoryId) {
          stats.historyDocsBackfilled++;
          hasUpdates = true;
          if (!dryRun) {
            stampBatch.update(historyDoc.ref, { congregationId, territoryId: territoryDoc.id });
          }
        }
      }

      if (hasUpdates && !dryRun) {
        await stampBatch.commit();
      }
    }

    if (snapshot.size < PAGE_SIZE) break;
    cursor = snapshot.docs[snapshot.size - 1];
  }

  return stats;
}

async function main(): Promise<void> {
  console.log(
    `Territory history stamps backfill ${
      dryRun ? '(DRY RUN)' : ''
    }: stamps congregationId/territoryId on history documents\n`,
  );

  const stats = await backfillHistoryStamps();

  console.log(
    `Done.\n  Territories scanned: ${stats.territoriesScanned}\n` +
      `  History docs scanned: ${stats.historyDocsScanned}, backfilled: ${stats.historyDocsBackfilled}${
        dryRun ? ' (dry run - no writes)' : ''
      }`,
  );
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});

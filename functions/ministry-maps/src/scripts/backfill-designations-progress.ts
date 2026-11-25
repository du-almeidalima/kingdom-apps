import { FieldPath, QueryDocumentSnapshot, QuerySnapshot } from 'firebase-admin/firestore';

import { DesignationsHeaderDoc } from '../models/designations-header';
import { db } from '../config/firebase';
import { buildDesignationsProgress } from '../utils/designations-progress-builder';

const PAGE_SIZE = 100;
const dryRun = process.argv.includes('--dry-run');

if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set FIRESTORE_EMULATOR_HOST (emulator) or GOOGLE_APPLICATION_CREDENTIALS (production).');
  process.exit(1);
}

type BackfillStats = {
  headersScanned: number;
  progressWritten: number;
  territoriesSkipped: number;
  headersFailed: number;
};

async function backfillDesignationsProgress(): Promise<BackfillStats> {
  const stats: BackfillStats = {
    headersScanned: 0,
    progressWritten: 0,
    territoriesSkipped: 0,
    headersFailed: 0,
  };
  let cursor: QueryDocumentSnapshot | null = null;

  for (;;) {
    const base = db.collection('designations_header').orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    const snapshot: QuerySnapshot = await (cursor ? base.startAfter(cursor) : base).get();
    if (snapshot.empty) break;

    for (const headerDoc of snapshot.docs) {
      stats.headersScanned++;
      try {
        const header = { ...headerDoc.data(), id: headerDoc.id } as DesignationsHeaderDoc;
        if (!header.congregationId) {
          console.warn(`Header [${header.id}] has no congregationId; skipping.`);
          continue;
        }

        const designationSnapshot = await db
          .collection('designations')
          .where('designationHeaderId', '==', header.id)
          .get();

        const designations = designationSnapshot.docs.map((item) => ({
          ...item.data(),
          id: item.id,
        })) as Parameters<typeof buildDesignationsProgress>[1];

        const { progress, skipped } = buildDesignationsProgress(header, designations);
        stats.territoriesSkipped += skipped.length;
        for (const item of skipped) {
          console.warn(
            `DONE territory [${item.territoryId}] in Designation [${item.designationId}] has no/invalid history; omitted.`,
          );
        }

        if (!dryRun) {
          await headerDoc.ref.collection('progress').doc('summary').set(progress);
        }
        stats.progressWritten++;
      } catch (error) {
        stats.headersFailed++;
        console.error(`Failed to backfill Header [${headerDoc.id}]:`, error);
      }
    }

    if (snapshot.size < PAGE_SIZE) break;
    cursor = snapshot.docs[snapshot.size - 1];
  }
  return stats;
}

async function main(): Promise<void> {
  console.log(`Designations progress backfill${dryRun ? ' (DRY RUN)' : ''}.`);
  const stats = await backfillDesignationsProgress();
  console.log(
    `Done.\n  Headers scanned: ${stats.headersScanned}\n  Progress documents ${
      dryRun ? 'planned' : 'written'
    }: ${stats.progressWritten}\n  Territories skipped: ${stats.territoriesSkipped}\n  Headers failed: ${
      stats.headersFailed
    }`,
  );
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});

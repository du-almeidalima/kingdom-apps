import { onSchedule } from 'firebase-functions/v2/scheduler';
import { CollectionReference, FieldValue } from 'firebase-admin/firestore';
import logger from 'firebase-functions/logger';
import { db } from '../config/firebase';
import type { DesignationsHeaderDoc } from '../models/designations-header';

export const closeDesignationsHeaders = onSchedule(
  { schedule: '0 0 * * *', timeZone: 'America/Sao_Paulo' },
  async () => {
    logger.info('Starting daily scheduled closing of open designations headers.');

    const headersCollection = db.collection('designations_header') as CollectionReference<DesignationsHeaderDoc>;
    const openSnapshot = await headersCollection.where('status', '==', 'IN_PROGRESS').get();

    if (openSnapshot.empty) {
      logger.info('No open designations headers to close.');
      return;
    }

    // Chunk in batches of 400 (comfortably under Firestore 500-operation batch cap)
    const BATCH_LIMIT = 400;
    const docs = openSnapshot.docs;

    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const chunk = docs.slice(i, i + BATCH_LIMIT);
      const batch = db.batch();

      for (const doc of chunk) {
        batch.update(doc.ref, {
          status: 'DONE',
          closedAt: FieldValue.serverTimestamp(),
          closedBy: 'CRON',
        });
      }

      await batch.commit();
    }

    logger.info(`Successfully closed ${docs.length} designations header(s).`);
  },
);

'use strict';

/**
 * One-time backfill for the `expireAt` TTL field (designations + logs):
 *   - basis date + 180 days (designations: createdAt; logs: timestamp; fallback: now)
 *   - documents older than 1 year are deleted outright
 *   - idempotent: documents that already have `expireAt` are skipped
 * Each page of documents commits atomically in one transaction.
 *
 * Usage (refuses to run without one of these, to avoid hitting an unintended project):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/backfill-ttl.js [--dry-run]
 *   GOOGLE_APPLICATION_CREDENTIALS=<path> node scripts/backfill-ttl.js [--dry-run]
 */

const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TTL_MS = 180 * MS_PER_DAY;
const DELETE_AFTER_MS = 365 * MS_PER_DAY;
const PAGE_SIZE = 300; // transactions cap at 500 writes

const dryRun = process.argv.includes('--dry-run');

if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set FIRESTORE_EMULATOR_HOST (emulator) or GOOGLE_APPLICATION_CREDENTIALS (production).');
  process.exit(1);
}

initializeApp({ credential: admin.credential.applicationDefault() });

const db = getFirestore();

const collections = [
  { name: 'designations', dateField: 'createdAt' },
  { name: 'logs', dateField: 'timestamp' },
];

function basisMillis(data, dateField) {
  const value = data[dateField];
  return value instanceof Timestamp ? value.toMillis() : null;
}

async function backfillCollection({ name, dateField }) {
  const stats = { scanned: 0, skipped: 0, backfilled: 0, deleted: 0, fallbacks: [] };
  let cursor = null;

  for (;;) {
    const pageQuery = (startAfter) => {
      const base = db.collection(name).orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
      return startAfter ? base.startAfter(startAfter) : base;
    };

    const applyTo = (transaction, snapshot) => {
      for (const doc of snapshot.docs) {
        stats.scanned++;
        const data = doc.data();
        if (data.expireAt !== undefined && data.expireAt !== null) {
          stats.skipped++;
          continue;
        }

        const basis = basisMillis(data, dateField);

        if (basis !== null && Date.now() - basis > DELETE_AFTER_MS) {
          stats.deleted++;
          if (transaction) transaction.delete(doc.ref);
          continue;
        }

        if (basis === null) {
          stats.fallbacks.push(`${name}/${doc.id}`);
        }
        const expireAt = basis !== null ? basis + TTL_MS : Date.now() + TTL_MS;
        stats.backfilled++;
        if (transaction) transaction.update(doc.ref, { expireAt: Timestamp.fromMillis(expireAt) });
      }
    };

    const { lastDoc, size } = dryRun
      ? await (async () => {
          const snapshot = await (cursor ? pageQuery(cursor).get() : pageQuery(null).get());
          if (snapshot.empty) return { lastDoc: null, size: 0 };
          applyTo(null, snapshot);
          return { lastDoc: snapshot.docs[snapshot.size - 1], size: snapshot.size };
        })()
      : await db.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(cursor ? pageQuery(cursor) : pageQuery(null));
          if (snapshot.empty) return { lastDoc: null, size: 0 };
          applyTo(transaction, snapshot);
          return { lastDoc: snapshot.docs[snapshot.size - 1], size: snapshot.size };
        });

    if (!lastDoc || size < PAGE_SIZE) break;
    cursor = lastDoc;
  }

  return stats;
}

async function main() {
  console.log(`TTL backfill ${dryRun ? '(DRY RUN)' : ''}: expireAt = basis date + 180d; older than 1y deleted\n`);

  for (const collection of collections) {
    const stats = await backfillCollection(collection);

    console.log(`${collection.name} (basis: ${collection.dateField}):`);
    console.log(`  scanned: ${stats.scanned}, skipped: ${stats.skipped}, backfilled: ${stats.backfilled}` +
      `${dryRun ? ' (would write)' : ''}, deleted: ${stats.deleted}${dryRun ? ' (would delete)' : ''}`);
    for (const path of stats.fallbacks) {
      console.log(`  fallback (missing ${collection.dateField}, used now + 180d): ${path}`);
    }
    console.log('');
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});

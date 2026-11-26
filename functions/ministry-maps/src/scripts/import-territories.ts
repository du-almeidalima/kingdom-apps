/**
 * Imports congregation territories and their initial visit history from a 14-column TSV file.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node lib/scripts/import-territories.js --congregation-id=<id> --file=<path.tsv> [--dry-run]
 *   GOOGLE_APPLICATION_CREDENTIALS=<path> node lib/scripts/import-territories.js --congregation-id=<id> --file=<path.tsv> [--dry-run]
 */

import { db } from '../config/firebase';
import { buildTerritoryImportPlan } from './territory-importer/territory-import-builder';
import { validateTerritoryImportRows } from './territory-importer/territory-import-validator';
import { writeImportedTerritories } from './territory-importer/territory-firestore-writer';
import { readTerritoryTsvFile } from './territory-importer/tsv-territory-reader';

type CliArgs = {
  congregationId: string;
  filePath: string;
  dryRun: boolean;
};

const parseCliArgs = (argv: readonly string[]): CliArgs => {
  let congregationId = '';
  let filePath = '';
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--congregation-id=')) {
      congregationId = arg.slice('--congregation-id='.length).trim();
    } else if (arg === '--congregation-id' && argv[i + 1]) {
      congregationId = argv[++i].trim();
    } else if (arg.startsWith('--file=')) {
      filePath = arg.slice('--file='.length).trim();
    } else if (arg === '--file' && argv[i + 1]) {
      filePath = argv[++i].trim();
    }
  }

  if (!congregationId || !filePath) {
    console.error(
      'Usage: node lib/scripts/import-territories.js --congregation-id=<id> --file=<path.tsv> [--dry-run]',
    );
    process.exit(1);
  }

  return { congregationId, filePath, dryRun };
};

if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set FIRESTORE_EMULATOR_HOST (emulator) or GOOGLE_APPLICATION_CREDENTIALS (production).');
  process.exit(1);
}

async function main(): Promise<void> {
  const { congregationId, filePath, dryRun } = parseCliArgs(process.argv.slice(2));

  console.log(
    `Territory import${dryRun ? ' (DRY RUN)' : ''} for congregation [${congregationId}] from [${filePath}].`,
  );

  const congregationSnap = await db.collection('congregations').doc(congregationId).get();
  if (!congregationSnap.exists) {
    console.error(`Congregation [${congregationId}] does not exist in Firestore.`);
    process.exit(1);
  }

  const congregationData = congregationSnap.data() ?? {};
  const allowedCities = Array.isArray(congregationData['cities'])
    ? (congregationData['cities'] as string[])
    : [];

  if (allowedCities.length === 0) {
    console.error(
      `Congregation [${congregationId}] has no cities configured. Add the cities in the app before importing.`,
    );
    process.exit(1);
  }

  const rawRows = readTerritoryTsvFile(filePath);
  if (rawRows.length === 0) {
    console.error(`No territory rows found in [${filePath}].`);
    process.exit(1);
  }

  const { validRows, errors } = validateTerritoryImportRows(rawRows, allowedCities);
  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} error(s):`);
    for (const err of errors) {
      console.error(`  Line ${err.lineNumber} [${err.field}]: ${err.message}`);
    }
    process.exit(1);
  }

  const plan = buildTerritoryImportPlan(
    validRows,
    congregationId,
    () => db.collection('territories').doc().id,
  );

  const countByCity = new Map<string, number>();
  let bibleStudentsCount = 0;
  let revisitsCount = 0;

  for (const item of plan) {
    countByCity.set(item.territory.city, (countByCity.get(item.territory.city) ?? 0) + 1);
    if (item.territory.isBibleStudent) bibleStudentsCount++;
    if (item.history?.isRevisit) revisitsCount++;
  }

  const stats = await writeImportedTerritories(db, plan, { dryRun });

  console.log(
    `Done.\n` +
      `  Congregation: ${congregationData['name'] ?? congregationId} (${congregationId})\n` +
      `  Territories ${dryRun ? 'planned' : 'written'}: ${stats.territoriesWritten}\n` +
      `  History entries ${dryRun ? 'planned' : 'written'}: ${stats.historyDocsWritten}\n` +
      `  Bible students: ${bibleStudentsCount}\n` +
      `  Active revisits: ${revisitsCount}\n` +
      `  Batches committed: ${stats.batchesCommitted}\n` +
      `  By city:\n` +
      Array.from(countByCity.entries())
        .map(([city, count]) => `    - ${city}: ${count}`)
        .join('\n'),
  );
}

main().catch((error) => {
  console.error('Territory import failed:', error);
  process.exit(1);
});

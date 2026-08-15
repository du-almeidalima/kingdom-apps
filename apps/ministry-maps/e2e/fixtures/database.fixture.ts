import { expect, test as base } from '@playwright/test';

import { auth, firestore } from '../config/firebase-admin.context';
import { Collections, TERRITORY_HISTORY_SUBCOLLECTION } from '../seed/collections';
import {
  getCollectionDocs,
  getDoc,
  getDocSnapshot,
  getSubcollectionDocs,
  queryWhere
} from '../firebase/firestore-read.util';
import { resetEmulators } from '../firebase/reset.util';
import * as factories from '../seed/factories';
import { buildDefaultSeed, DEFAULT_SEED_IDS } from '../seed/default.seed';
import { seed as writeSeed } from '../seed/seeder';

/**
 * Seeding API exposed to tests for building extra data on demand and writing it
 * to the emulators.
 */
export interface SeedApi {
  /** Typed entity builders (e.g. `seed.factories.buildTerritory({...})`). */
  factories: typeof factories;
  /** Writes a `SeedDefinition` to the emulators and returns the created ids. */
  write: typeof writeSeed;
  /** Well-known ids of the default baseline entities. */
  ids: typeof DEFAULT_SEED_IDS;
}

/** Admin SDK read helpers exposed to tests for asserting Firestore state. */
export interface DbApi {
  /** Raw Admin SDK handles — escape hatch for anything not covered below. */
  firestore: typeof firestore;
  auth: typeof auth;
  collections: typeof Collections;
  historySubcollection: typeof TERRITORY_HISTORY_SUBCOLLECTION;
  getDoc: typeof getDoc;
  getDocSnapshot: typeof getDocSnapshot;
  getCollectionDocs: typeof getCollectionDocs;
  getSubcollectionDocs: typeof getSubcollectionDocs;
  queryWhere: typeof queryWhere;
}

// Both APIs are stateless bundles of module-level functions/handles, so a single shared instance is safe; the fixtures
// below only inject them.
const seedApi: SeedApi = {
  factories,
  write: writeSeed,
  ids: DEFAULT_SEED_IDS,
};

const dbApi: DbApi = {
  firestore,
  auth,
  collections: Collections,
  historySubcollection: TERRITORY_HISTORY_SUBCOLLECTION,
  getDoc,
  getDocSnapshot,
  getCollectionDocs,
  getSubcollectionDocs,
  queryWhere,
};

interface DatabaseFixtures {
  /**
   * Auto fixture: clears the Firestore + Auth emulators and applies the default seed before every test, guaranteeing a
   * known, isolated baseline.
   *
   * Fixtures whose SETUP depends on this state (e.g. `authenticatedPage`) must declare `resetAndSeed` as a dependency,
   * so Playwright orders them after it.
   *
   * Note: the E2E emulator starts EMPTY (the Playwright `webServer` uses `firebase emulators:exec`, which does not
   * `--import` any data), so this seeding is the sole source of test data.
   */
  resetAndSeed: void;
  seed: SeedApi;
  db: DbApi;
}

export const test = base.extend<DatabaseFixtures>({
  resetAndSeed: [
    async ({}, use) => {
      await resetEmulators();
      await writeSeed(buildDefaultSeed());
      await use();
    },
    { auto: true },
  ],
  seed: async ({}, use) => {
    await use(seedApi);
  },
  db: async ({}, use) => {
    await use(dbApi);
  },
});

export { expect };

import { test as base, expect } from '@playwright/test';

import { firestore, auth, Collections } from '../config/firebase-admin.context';
import {
  TERRITORY_HISTORY_SUBCOLLECTION,
  congregationRef,
  territoryRef,
  territoryHistoryRef,
  userRef,
  designationRef,
} from '../firebase/refs.util';
import {
  getDoc,
  getDocSnapshot,
  getCollectionDocs,
  getSubcollectionDocs,
  queryWhere,
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
  /** Builds the default baseline definition (already applied before each test). */
  buildDefault: typeof buildDefaultSeed;
  /** Well-known ids of the default baseline entities. */
  ids: typeof DEFAULT_SEED_IDS;
}

/** Admin SDK read helpers exposed to tests for asserting Firestore state. */
export interface DbApi {
  firestore: typeof firestore;
  auth: typeof auth;
  collections: typeof Collections;
  historySubcollection: typeof TERRITORY_HISTORY_SUBCOLLECTION;
  congregationRef: typeof congregationRef;
  territoryRef: typeof territoryRef;
  territoryHistoryRef: typeof territoryHistoryRef;
  userRef: typeof userRef;
  designationRef: typeof designationRef;
  getDoc: typeof getDoc;
  getDocSnapshot: typeof getDocSnapshot;
  getCollectionDocs: typeof getCollectionDocs;
  getSubcollectionDocs: typeof getSubcollectionDocs;
  queryWhere: typeof queryWhere;
}

interface DatabaseFixtures {
  /**
   * Auto fixture: clears the Firestore + Auth emulators and applies the default
   * seed before every test, guaranteeing a known, isolated baseline.
   *
   * Note: the E2E emulator starts EMPTY (the Playwright `webServer` uses
   * `firebase emulators:exec`, which does not `--import` any data), so this
   * seeding is the sole source of test data.
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
    await use({
      factories,
      write: writeSeed,
      buildDefault: buildDefaultSeed,
      ids: DEFAULT_SEED_IDS,
    });
  },
  db: async ({}, use) => {
    await use({
      firestore,
      auth,
      collections: Collections,
      historySubcollection: TERRITORY_HISTORY_SUBCOLLECTION,
      congregationRef,
      territoryRef,
      territoryHistoryRef,
      userRef,
      designationRef,
      getDoc,
      getDocSnapshot,
      getCollectionDocs,
      getSubcollectionDocs,
      queryWhere,
    });
  },
});

export { expect };

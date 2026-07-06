import * as admin from 'firebase-admin';

import {
  EMULATOR_CONFIG,
  FIRESTORE_EMULATOR_HOST,
  AUTH_EMULATOR_HOST,
} from './emulator.config';

// Route the Admin SDK to the local emulators.
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST;

// Initialize the Admin app once (idempotent across module re-imports).
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: EMULATOR_CONFIG.projectId,
  });
}

// TODO: Is this necessary?
/** Re-export the authenticated `app` for advanced usage. */
export const app = admin.apps[0];

/** Admin Firestore handle (points at the emulator). */
export const firestore = admin.firestore();

/**
 * Let optional model fields (e.g. `mapsLink`, `bibleInstructor`) be `undefined`
 * in seed payloads — the Admin SDK drops them instead of throwing.
 */
firestore.settings({ ignoreUndefinedProperties: true });

/** Admin Auth handle (points at the emulator). */
export const auth = admin.auth();

// TODO: These should be defined on the factories.
/** Firestore collection names, mirrored from the app's datasource services. */
export const Collections = {
  congregations: 'congregations',
  users: 'users',
  territories: 'territories',
  designations: 'designations',
} as const;

import * as admin from 'firebase-admin';

import { AUTH_EMULATOR_HOST, EMULATOR_CONFIG, FIRESTORE_EMULATOR_HOST } from './emulator.config';

// Route the Admin SDK to the local emulators. This must run before
// `admin.initializeApp()`/`admin.firestore()`/`admin.auth()` below, which is
// guaranteed here since both exports come from this same module — any other
// module that needs `firestore`/`auth` triggers this file (and these env
// mutations) first, standard practice for the Admin SDK emulator pattern.
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST;

// Initialize the Admin app once (idempotent across module re-imports).
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: EMULATOR_CONFIG.projectId,
  });
}

/** Admin Firestore handle (points at the emulator). */
export const firestore = admin.firestore();

/**
 * Let optional model fields (e.g. `mapsLink`, `bibleInstructor`) be `undefined`
 * in seed payloads — the Admin SDK drops them instead of throwing.
 */
firestore.settings({ ignoreUndefinedProperties: true });

/** Admin Auth handle (points at the emulator). */
export const auth = admin.auth();

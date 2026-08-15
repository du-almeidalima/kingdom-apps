/**
 * Emulator connection configuration.
 *
 * Single source of truth for ports, hosts, and derived REST URLs. Kept in
 * sync with `firebase.json` (Firestore 8080, Auth 9099, Functions 5001) and the
 * `--project` flag used by the Playwright `webServer`.
 */
export const EMULATOR_CONFIG = {
  projectId: 'du-ministry-maps',
  firestore: { host: '127.0.0.1', port: 8080 },
  auth: { host: '127.0.0.1', port: 9099 },
  functions: { host: '127.0.0.1', port: 5001 },
} as const;

/** `host:port` string for the Admin SDK `FIRESTORE_EMULATOR_HOST` env var. */
export const FIRESTORE_EMULATOR_HOST = `${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}`;

/** `host:port` string for the Admin SDK `FIREBASE_AUTH_EMULATOR_HOST` env var. */
export const AUTH_EMULATOR_HOST = `${EMULATOR_CONFIG.auth.host}:${EMULATOR_CONFIG.auth.port}`;

/** REST endpoint that wipes every Firestore document (incl. subcollections). */
export const FIRESTORE_CLEAR_URL = `http://${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}/emulator/v1/projects/${EMULATOR_CONFIG.projectId}/databases/(default)/documents`;

/** REST endpoint that wipes every Auth account. */
export const AUTH_CLEAR_URL = `http://${EMULATOR_CONFIG.auth.host}:${EMULATOR_CONFIG.auth.port}/emulator/v1/projects/${EMULATOR_CONFIG.projectId}/accounts`;

/** Base URL for Firestore v1 REST API documents. */
export const FIRESTORE_DOCUMENTS_URL = `http://${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}/v1/projects/${EMULATOR_CONFIG.projectId}/databases/(default)/documents`;

/** Auth REST endpoint to exchange a custom token for an ID token. */
export const AUTH_SIGN_IN_CUSTOM_TOKEN_URL = `http://${EMULATOR_CONFIG.auth.host}:${EMULATOR_CONFIG.auth.port}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=any`;

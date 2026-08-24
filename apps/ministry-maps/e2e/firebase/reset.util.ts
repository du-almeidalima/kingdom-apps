import { FIRESTORE_CLEAR_URL, AUTH_CLEAR_URL } from '../config/emulator.config';

/**
 * The E2E Firestore starts EMPTY: the Playwright `webServer` boots the
 * emulators via `firebase emulators:exec`, which (unlike the dev target) does
 * NOT `--import` any seed data. These helpers wipe the emulators between tests
 * so the database fixture can re-apply a known baseline before each test.
 *
 * Wiping is done through the emulators' own REST endpoints, which clear all
 * documents (including subcollections) and all Auth accounts atomically and
 * are faster than enumerating collections for a recursive delete.
 */

async function deleteOrThrow(url: string, label: string): Promise<void> {
  const response = await fetch(url, { method: 'DELETE' });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to clear ${label} (HTTP ${response.status}): ${body}`);
  }
}

/** Removes every Firestore document (and subcollection) from the emulator. Idempotent. */
export function clearFirestore(): Promise<void> {
  return deleteOrThrow(FIRESTORE_CLEAR_URL, 'Firestore emulator');
}

/** Removes every Auth account from the emulator. Idempotent. */
export function clearAuth(): Promise<void> {
  return deleteOrThrow(AUTH_CLEAR_URL, 'Auth emulator');
}

/** Wipes both Firestore and Auth so a fresh seed can be applied. */
export async function resetEmulators(): Promise<void> {
  await Promise.all([clearFirestore(), clearAuth()]);
}

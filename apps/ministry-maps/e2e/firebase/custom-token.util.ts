import { auth } from '../config/firebase-admin.context';

/**
 * Mints a Firebase custom token for the given uid using the Admin SDK. The
 * token can be exchanged for an Auth emulator session via
 * `signInWithCustomToken` in the browser, giving the test a real,
 * authenticated Firebase identity without driving the OAuth popup.
 */
export async function mintCustomToken(uid: string): Promise<string> {
  return auth.createCustomToken(uid);
}

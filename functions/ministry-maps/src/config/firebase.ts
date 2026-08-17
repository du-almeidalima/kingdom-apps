import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId =
  process.env['GCLOUD_PROJECT'] ||
  process.env['GOOGLE_CLOUD_PROJECT'] ||
  (process.env['FIRESTORE_EMULATOR_HOST'] ? 'du-ministry-maps' : undefined);

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });
}

export const db = getFirestore();
export const auth = getAuth();

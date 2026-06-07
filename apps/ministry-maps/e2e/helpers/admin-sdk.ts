import * as admin from 'firebase-admin';

// Force the Admin SDK to route traffic to your local emulators
// Make sure these ports match your firebase.json
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

// Initialize the app only once
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'du-ministry-maps',
  });
}

export const firestore = admin.firestore();
export const auth = admin.auth();

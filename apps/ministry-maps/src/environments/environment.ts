import { CongregationSettings } from '../models/congregation';

export const environment = {
  firebase: {
    projectId: process.env['NX_FIREBASE_PROJECT_ID'],
    appId: process.env['NX_FIREBASE_APP_ID'],
    storageBucket: process.env['NX_FIREBASE_STORAGE_BUCKET'],
    apiKey: process.env['NX_FIREBASE_API_KEY'],
    authDomain: process.env['NX_FIREBASE_AUTH_DOMAIN'],
    messagingSenderId: process.env['NX_FIREBASE_MESSAGING_SENDER_ID'],
    measurementId: process.env['NX_FIREBASE_MEASUREMENT_ID'],
  },
  production: process.env['NX_ENV'] === 'production',
  env: process.env['NX_ENV'],
  useCloud: process.env['NX_USE_CLOUD'] === 'true',
  baseUrl: process.env['NX_APP_BASE_URL'],
  congregationSettingsDefaultValues: {
    designationAccessExpiryDays: 45,
    shouldDesignationBlockAfterExpired: false,
  } as CongregationSettings,
};

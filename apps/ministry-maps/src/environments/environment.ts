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
  } as CongregationSettings
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

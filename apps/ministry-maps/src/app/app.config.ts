import { ApplicationConfig, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTheme } from '@kingdom-apps/common-ui';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth, signInWithCustomToken } from '@angular/fire/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  provideFirestore,
} from '@angular/fire/firestore';
import { connectFunctionsEmulator, getFunctions, provideFunctions } from '@angular/fire/functions';
import { getRemoteConfig, provideRemoteConfig } from '@angular/fire/remote-config';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { APP_ROUTES } from './app-routes';
import { REPOSITORIES_PROVIDERS } from './repositories/repositories-providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideTheme({
      storageKey: 'ministry-maps.theme-preference',
      metaColors: { light: '#E7E6E4', dark: '#121212' },
      metaSelector: 'meta[name="theme-color"][data-mm-theme-color]',
    }),
    ...REPOSITORIES_PROVIDERS,
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(APP_ROUTES),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      const auth = getAuth();
      // This allows running Angular in HMR
      // @ts-expect-error this property is not exposed, but need to avoid problems when running Angular in HMR
      if (auth['_isInitialized']) {
        return auth;
      }

      if (environment.env === 'development' && !environment.useCloud) {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });

        // Expose the Auth instance and signInWithCustomToken on `window` so the
        // E2E test fixture can establish a real Firebase session in the browser
        // without driving the OAuth popup. This code is NEVER reached in
        // production builds (gated by env + !useCloud above).
        window.__E2E__ = { auth, signInWithCustomToken };
      }

      return auth;
    }),
    provideFirestore(() => {
      const firestore = initializeFirestore(getApp(), {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });

      // const firestore = getFirestore();
      if (environment.env === 'development' && !environment.useCloud) {
        // This allows running Angular in HMR
        // @ts-expect-error this property is not exposed, but need to avoid problems when running Angular in HMR
        if (firestore['_initialized']) {
          return firestore;
        }
        console.log('emulador');
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }

      return firestore;
    }),
    provideFunctions(() => {
      const functions = getFunctions();

      if (environment.env === 'development' && !environment.useCloud) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }

      return functions;
    }),
    provideRemoteConfig(() => getRemoteConfig()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};

import { ApplicationConfig, isDevMode, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
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
import { appLoginInitializer } from './app-login-initializer';
import { APP_ROUTES } from './app-routes';
import { REPOSITORIES_PROVIDERS } from './repositories/repositories-providers';

export const appConfig: ApplicationConfig = {
  providers: [
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
        connectAuthEmulator(auth, 'http://localhost:9099');
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
    provideAppInitializer(() => appLoginInitializer()),
  ],
};

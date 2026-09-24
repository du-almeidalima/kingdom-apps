import { inject, InjectionToken, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithCustomToken } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import type { Functions } from 'firebase/functions';

import { environment } from '../../../environments/environment';

/**
 * DI tokens for the vanilla Firebase SDK instances.
 *
 * Named after the service (`FIREBASE_APP`, `FIREBASE_AUTH`, `FIRESTORE`, `FUNCTIONS`) to avoid
 * colliding with the SDK *types* (`Auth`, `Firestore`, `Functions`) used in signatures — only
 * the datasources and this module ever inject them; the rest of the app stays behind the
 * abstract repositories.
 */
export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');
export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');
export const FUNCTIONS = new InjectionToken<Functions>('FUNCTIONS');

/**
 * Boots the vanilla Firebase SDK and exposes its instances through the {@link FIREBASE_APP},
 * {@link FIREBASE_AUTH}, {@link FIRESTORE} and {@link FUNCTIONS} tokens.
 *
 * - Firestore keeps offline persistence with the multi-tab manager.
 * - In dev-non-cloud builds the emulators are wired (auth 9099, firestore 8080,
 *   functions 5001 — mirroring `firebase.json`) and the E2E bridge
 *   `window.__E2E__ = { auth, signInWithCustomToken }` is installed.
 * - `provideAppInitializer` forces the instances to exist before the router/auth guards run,
 *   matching the eager bootstrap timing the previous AngularFire `provide*` blocks had.
 */
export function provideFirebase(): EnvironmentProviders {
  const useEmulators = environment.env === 'development' && !environment.useCloud;

  return makeEnvironmentProviders([
    {
      provide: FIREBASE_APP,
      useFactory: () => initializeApp(environment.firebase),
    },
    {
      provide: FIREBASE_AUTH,
      useFactory: () => {
        const auth = getAuth(inject(FIREBASE_APP));

        // This allows running Angular in HMR
        // @ts-expect-error this property is not exposed, but need to avoid problems when running Angular in HMR
        if (auth['_isInitialized']) {
          return auth;
        }

        if (useEmulators) {
          connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });

          // Expose the Auth instance and signInWithCustomToken on `window` so the
          // E2E test fixture can establish a real Firebase session in the browser
          // without driving the OAuth popup. This code is NEVER reached in
          // production builds (gated by env + !useCloud above).
          window.__E2E__ = { auth, signInWithCustomToken };
        }

        return auth;
      },
    },
    {
      provide: FIRESTORE,
      useFactory: () => {
        const firestore = initializeFirestore(inject(FIREBASE_APP), {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });

        if (useEmulators) {
          // This allows running Angular in HMR
          // @ts-expect-error this property is not exposed, but need to avoid problems when running Angular in HMR
          if (firestore['_initialized']) {
            return firestore;
          }

          connectFirestoreEmulator(firestore, 'localhost', 8080);
        }

        return firestore;
      },
    },
    {
      provide: FUNCTIONS,
      useFactory: () => {
        const functions = getFunctions(inject(FIREBASE_APP));

        if (useEmulators) {
          connectFunctionsEmulator(functions, 'localhost', 5001);
        }

        return functions;
      },
    },
    // Eagerly create every instance before the application starts: AuthService subscribes to
    // the auth state from its constructor, so auth + emulator wiring must exist by then.
    provideAppInitializer(() => {
      inject(FIREBASE_APP);
      inject(FIREBASE_AUTH);
      inject(FIRESTORE);
      inject(FUNCTIONS);
    }),
  ]);
}

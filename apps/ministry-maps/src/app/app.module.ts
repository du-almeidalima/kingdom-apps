import { APP_INITIALIZER, Injector, isDevMode, NgModule } from '@angular/core';
import { ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import { connectFunctionsEmulator, getFunctions, provideFunctions } from '@angular/fire/functions';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  provideFirestore,
} from '@angular/fire/firestore';
import { BrowserModule } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';

import { CommonComponentsModule, SpinnerComponent } from '@kingdom-apps/common-ui';

import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { AppRoutesModule } from './app-routes.module';
import { appRunner } from './app-runnder';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { SharedModule } from './shared/shared.module';
import { createCustomElement } from '@angular/elements';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    // providePerformance(() => getPerformance()),
    // provideRemoteConfig(() => getRemoteConfig()),
    AppRoutesModule,
    RouterOutlet,
    RepositoriesModule,
    CoreModule,
    CommonComponentsModule,
    SharedModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
    // provideAppCheck(() => {
    //   // TODO get a reCAPTCHA Enterprise here https://console.cloud.google.com/security/recaptcha?project=_
    //   const provider = new ReCaptchaEnterpriseProvider(/* reCAPTCHA Enterprise site key */);
    //   return initializeAppCheck(undefined, { provider, isTokenAutoRefreshEnabled: true });
    // }),
  ],
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      const auth = getAuth();
      // This allows running Angular in HMR
      // @ts-expect-error this property is not exposed, but need to avoid problems when running Angular in HMR
      if (auth['_isInitialized']) {
        return auth;
      }

      if (environment.env === 'development' && !environment.useCloud)
        connectAuthEmulator(auth, 'http://localhost:9099');
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
    ScreenTrackingService,
    UserTrackingService,
    {
      provide: APP_INITIALIZER,
      useFactory: appRunner,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(private injector: Injector) {
    // This component needs to be transformed into a WebComponent in order for it to be used in the index.html
    const spinnerElement = createCustomElement(SpinnerComponent, {
      injector: this.injector
    });

    !customElements.get('web-lib-spinner') && customElements.define('web-lib-spinner', spinnerElement);
  }
}

import { APP_INITIALIZER, Injector, isDevMode, NgModule } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import {
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  getFirestore,
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
import { RepositoryModule } from './repositories/repository.module';
import { SharedModule } from './shared/shared.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      const auth = getAuth();
      // This allows to run Angular in HMR
      // @ts-ignore
      if (auth['_isInitialized']) {
        return auth;
      }

      if (environment.env === 'development' && !environment.useCloud)
        connectAuthEmulator(auth, 'http://localhost:9099');
      return auth;
    }),
    provideFirestore(() => {
      const firestore = getFirestore();
      if (environment.env === 'development' && !environment.useCloud) {
        // This allows to run Angular in HMR
        // @ts-ignore
        if (firestore['_initialized']) {
          return firestore;
        }
        console.log('emulador');
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }

      // TODO: Upgrade this
      enableIndexedDbPersistence(firestore)
        .then(() => {
          console.log('Persistence enabled');
        })
        .catch(err => {
          console.log('Persistence failed', err);
        });
      return firestore;
    }),
    // provideFunctions(() => getFunctions()),
    // providePerformance(() => getPerformance()),
    // provideRemoteConfig(() => getRemoteConfig()),
    AppRoutesModule,
    RouterOutlet,
    RepositoryModule,
    CoreModule,
    CommonComponentsModule,
    SharedModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
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

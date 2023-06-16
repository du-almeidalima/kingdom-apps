import { APP_INITIALIZER, isDevMode, NgModule } from '@angular/core';
import { ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { enableIndexedDbPersistence, getFirestore, provideFirestore } from '@angular/fire/firestore';
import { BrowserModule } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';

import { CommonComponentsModule } from '@kingdom-apps/common-ui';

import { environment } from '../environments/environment';
import { AppRoutesModule } from './app-routes.module';
import { appRunner } from './app-runnder';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { SharedModule } from './shared/shared.module';
import { ServiceWorkerModule } from '@angular/service-worker';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => {
      const firestore = getFirestore();
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
    RepositoriesModule,
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
export class AppModule {}

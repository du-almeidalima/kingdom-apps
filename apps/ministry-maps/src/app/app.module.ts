import { APP_INITIALIZER, NgModule } from '@angular/core';
import { getAnalytics, provideAnalytics, ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getPerformance, providePerformance } from '@angular/fire/performance';
import { getRemoteConfig, provideRemoteConfig } from '@angular/fire/remote-config';
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

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAnalytics(() => getAnalytics()),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideFunctions(() => getFunctions()),
    providePerformance(() => getPerformance()),
    provideRemoteConfig(() => getRemoteConfig()),
    AppRoutesModule,
    RouterOutlet,
    RepositoriesModule,
    CoreModule,
    CommonComponentsModule,
    SharedModule,
  ],
  providers: [
    ScreenTrackingService,
    UserTrackingService,
    {
      provide: APP_INITIALIZER,
      useFactory: appRunner,
      multi: true
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }

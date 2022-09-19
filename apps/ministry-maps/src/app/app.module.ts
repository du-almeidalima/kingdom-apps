import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { HeaderComponent } from '@kingdom-apps/common-components';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { environment } from '../environments/environment';
import {
  getAnalytics,
  provideAnalytics,
  ScreenTrackingService,
  UserTrackingService,
} from '@angular/fire/analytics';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getPerformance, providePerformance } from '@angular/fire/performance';
import {
  getRemoteConfig,
  provideRemoteConfig,
} from '@angular/fire/remote-config';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HeaderComponent,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAnalytics(() => getAnalytics()),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideFunctions(() => getFunctions()),
    providePerformance(() => getPerformance()),
    provideRemoteConfig(() => getRemoteConfig()),
  ],
  providers: [ScreenTrackingService, UserTrackingService],
  bootstrap: [AppComponent],
})
export class AppModule {}

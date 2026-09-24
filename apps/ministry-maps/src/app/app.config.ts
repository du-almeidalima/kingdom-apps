import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTheme } from '@kingdom-apps/common-ui';
import { provideServiceWorker } from '@angular/service-worker';
import { APP_ROUTES } from './app-routes';
import { REPOSITORIES_PROVIDERS } from './repositories/repositories-providers';
import { provideFirebase } from './repositories/firebase/firebase-providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideTheme({
      storageKey: 'ministry-maps.theme-preference',
      metaColors: { light: '#E7E6E4', dark: '#121212' },
      metaSelector: 'meta[name="theme-color"][data-mm-theme-color]',
    }),
    ...REPOSITORIES_PROVIDERS,
    provideRouter(APP_ROUTES),
    provideFirebase(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};

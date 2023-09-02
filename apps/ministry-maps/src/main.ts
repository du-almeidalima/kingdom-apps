import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

console.log('>>> IS PRODUCTION', process.env['environment.production']);
console.log('>>> Use Firebase on the cloud', environment.useCloud ?? false);

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));

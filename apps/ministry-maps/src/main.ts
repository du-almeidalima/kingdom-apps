import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

console.log('>>> Environment: ', environment.env);
console.log('>>> Use Firebase on the cloud', environment.useCloud ?? false);

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));

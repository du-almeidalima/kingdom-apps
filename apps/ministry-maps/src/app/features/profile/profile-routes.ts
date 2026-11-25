import { Route } from '@angular/router';
import { ProfilePageComponent } from './pages/profile-page/profile-page.component';
import { ProfileNotificationsPageComponent } from './pages/profile-notifications-page/profile-notifications-page.component';

export const PROFILE_ROUTES: Route[] = [
  { path: '', component: ProfilePageComponent },
  { path: 'notifications', component: ProfileNotificationsPageComponent },
];

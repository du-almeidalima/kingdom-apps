import { Route } from '@angular/router';
import { ConfigCongregationCitiesComponent } from './components/config-manage-congregation-citites/config-congregation-cities.component';
import { ConfigurationMainPageComponent } from './pages/main-page/configuration-main-page.component';

export const CONFIGURATION_ROUTES: Route[] = [
  {
    path: '',
    component: ConfigurationMainPageComponent,
    children: [{ path: '', component: ConfigCongregationCitiesComponent }],
  },
];

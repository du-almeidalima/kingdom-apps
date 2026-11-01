import { Route } from '@angular/router';
import { ConfigCongregationCitiesComponent } from './components/config-manage-congregation-citites/config-congregation-cities.component';
import { CONGREGATION_ALLOWED_ROLES } from './config/congregation-roles.config';
import { USERS_ALLOWED_ROLES } from './config/users-roles.config';
import { CongregationRoutesEnum } from './models/enums/congregation-routes';
import { ConfigurationMainPageComponent } from './pages/main-page/configuration-main-page.component';
import { UsersPageComponent } from './pages/users-page/users-page.component';

export const CONGREGATION_ROUTES: Route[] = [
  {
    path: CongregationRoutesEnum.INDEX,
    component: ConfigurationMainPageComponent,
    data: { roles: CONGREGATION_ALLOWED_ROLES },
    children: [{ path: '', component: ConfigCongregationCitiesComponent }],
  },
  {
    path: CongregationRoutesEnum.USERS,
    component: UsersPageComponent,
    data: { roles: USERS_ALLOWED_ROLES },
  },
];

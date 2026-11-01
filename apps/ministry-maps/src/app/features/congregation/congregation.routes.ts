import { Route } from '@angular/router';
import { CONGREGATION_ALLOWED_ROLES } from './config/congregation-roles.config';
import { USERS_ALLOWED_ROLES } from './config/users-roles.config';
import { CongregationRoutesEnum } from './models/enums/congregation-routes';
import { CongregationPageComponent } from './pages/congregation-page/congregation-page.component';
import { UsersPageComponent } from './pages/users-page/users-page.component';

export const CONGREGATION_ROUTES: Route[] = [
  {
    path: CongregationRoutesEnum.INDEX,
    component: CongregationPageComponent,
    data: { roles: CONGREGATION_ALLOWED_ROLES },
  },
  {
    path: CongregationRoutesEnum.USERS,
    component: UsersPageComponent,
    data: { roles: USERS_ALLOWED_ROLES },
  },
];

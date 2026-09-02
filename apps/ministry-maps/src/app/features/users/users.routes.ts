import { Route } from '@angular/router';
import { UsersPageComponent } from './pages/users-page/users-page.component';
import { UsersRoutesEnum } from './models/enums/users-routes';

export const USERS_ROUTES: Route[] = [
  {
    path: UsersRoutesEnum.INDEX,
    component: UsersPageComponent,
  },
];

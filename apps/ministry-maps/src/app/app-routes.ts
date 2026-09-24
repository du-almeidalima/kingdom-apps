import { Routes } from '@angular/router';

import { authGuard } from './core/features/auth/guards/auth.guard';
import { USERS_ALLOWED_ROLES } from './features/users/config/users-roles.config';
import { HOME_ALLOWED_ROLES } from './features/home/config/home-roles.config';
import { TERRITORY_ALLOWED_ROLES } from './features/territory/config/territory-roles.config';
import { AUTH_ROUTES } from './core/features/auth/auth-routes';

export enum FeatureRoutesEnum {
  HOME = 'home',
  TERRITORIES = 'territories',
  WORK = 'work',
  PROFILE = 'profile',
  CONFIGURATION = 'configuration',
  USERS = 'users',
}

export const APP_ROUTES: Routes = [
  ...AUTH_ROUTES,
  {
    path: FeatureRoutesEnum.WORK,
    loadChildren: () => import('./features/work/work.module').then((m) => m.WorkModule),
    data: { roles: ['*'] },
  },
  {
    path: FeatureRoutesEnum.TERRITORIES,
    loadChildren: () => import('./features/territory/territory.routes').then((m) => m.TERRITORY_ROUTES),
    canActivateChild: [authGuard],
    data: { roles: TERRITORY_ALLOWED_ROLES },
  },
  {
    path: FeatureRoutesEnum.HOME,
    loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
    canActivate: [authGuard],
    data: { roles: HOME_ALLOWED_ROLES },
  },
  {
    path: FeatureRoutesEnum.PROFILE,
    loadChildren: () => import('./features/profile/profile-routes').then((m) => m.PROFILE_ROUTES),
    canActivate: [authGuard],
    data: { roles: ['*'] },
  },
  {
    path: FeatureRoutesEnum.USERS,
    loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
    canActivate: [authGuard],
    data: { roles: USERS_ALLOWED_ROLES },
  },
  {
    path: FeatureRoutesEnum.CONFIGURATION,
    loadChildren: () => import('./features/configuration/configuration.routes').then((m) => m.CONFIGURATION_ROUTES),
    canActivate: [authGuard],
    data: { roles: ['*'] },
  },
  {
    path: '',
    redirectTo: FeatureRoutesEnum.HOME,
    pathMatch: 'full',
  },
];

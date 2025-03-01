import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { redirectUnauthorizedTo } from '@angular/fire/auth-guard';

import { authGuard } from './core/features/auth/guards/auth.guard';
import { USERS_ALLOWED_ROLES } from './features/users/users-routes.module';
import { HOME_ALLOWED_ROLES } from './features/home/home-routes.module';
import { TERRITORY_ALLOWED_ROLES } from './features/territory/territory-routes.module';
import { AuthRoutesEnum } from './core/features/auth/models/enums/auth-routes';

export enum FeatureRoutesEnum {
  HOME = 'home',
  TERRITORIES = 'territories',
  WORK = 'work',
  PROFILE = 'profile',
  USERS = 'users',
}

export const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo([AuthRoutesEnum.LOGIN]);

export const APP_ROUTES: Routes = [
  {
    path: FeatureRoutesEnum.WORK,
    loadChildren: () => import('./features/work/work.module').then(m => m.WorkModule),
    data: { roles: ['*'] },
  },
  {
    path: FeatureRoutesEnum.TERRITORIES,
    loadChildren: () => import('./features/territory/territory.module').then(m => m.TerritoryModule),
    canActivate: [authGuard],
    data: { roles: TERRITORY_ALLOWED_ROLES, authGuardPipe: redirectUnauthorizedToLogin },
  },
  {
    path: FeatureRoutesEnum.HOME,
    loadChildren: () => import('./features/home/home.module').then(m => m.HomeModule),
    canActivate: [authGuard],
    data: { roles: HOME_ALLOWED_ROLES, authGuardPipe: redirectUnauthorizedToLogin },
  },
  {
    path: FeatureRoutesEnum.PROFILE,
    loadChildren: () => import('./features/profile/profile-routes').then(m => m.PROFILE_ROUTES),
    canActivate: [authGuard],
    data: { roles: ['*'] },
  },
  {
    path: FeatureRoutesEnum.USERS,
    loadChildren: () => import('./features/users/users.module').then(m => m.UsersModule),
    canActivate: [authGuard],
    data: { roles: USERS_ALLOWED_ROLES, authGuardPipe: redirectUnauthorizedToLogin },
  },
  {
    path: '',
    redirectTo: FeatureRoutesEnum.HOME,
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(APP_ROUTES)],
  exports: [RouterModule],
})
export class AppRoutesModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { redirectUnauthorizedTo } from '@angular/fire/auth-guard';

import { authGuard } from './core/services/auth-guard/auth.guard';
import { profileMatchGuard } from './core/services/profile-match-guard/profile-match.guard';
import { USERS_ALLOWED_ROLES } from './features/users/users-routes.module';
import { HOME_ALLOWED_ROLES } from './features/home/home-routes.module';
import { TERRITORY_ALLOWED_ROLES } from './features/territory/territory-routes.module';

export enum FeatureRoutesEnum {
  HOME = 'home',
  TERRITORIES = 'territories',
  WORK = 'work',
  PROFILE = 'profile',
  USERS = 'users',
}

export const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['/login']);

export const APP_ROUTES: Routes = [
  // SING-LANGUAGE
  {
    path: FeatureRoutesEnum.WORK,
    loadChildren: () => import('./features/work/work.module').then(m => m.WorkModule),
    canMatch: [profileMatchGuard],
    data: { roles: ['*'], profiles: ['sign-language'] },
  },
  {
    path: FeatureRoutesEnum.TERRITORIES,
    loadChildren: () => import('./features/territory/territory.module').then(m => m.TerritoryModule),
    canMatch: [profileMatchGuard],
    canActivate: [authGuard],
    data: { roles: TERRITORY_ALLOWED_ROLES, profiles: ['sign-language'], authGuardPipe: redirectUnauthorizedToLogin },
  },
  // HEARING
  {
    path: FeatureRoutesEnum.WORK,
    loadChildren: () => import('./features/hearing-work/hearing-work.module').then(m => m.HearingWorkModule),
    canMatch: [profileMatchGuard],
    data: { roles: ['*'], profiles: ['hearing'] },
  },
  {
    path: FeatureRoutesEnum.TERRITORIES,
    loadChildren: () =>
      import('./features/hearing-territory/hearing-territory.module').then(m => m.HearingTerritoryModule),
    canMatch: [profileMatchGuard],
    canActivate: [authGuard],
    data: { roles: TERRITORY_ALLOWED_ROLES, profiles: ['hearing'], authGuardPipe: redirectUnauthorizedToLogin },
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

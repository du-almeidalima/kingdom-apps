import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { redirectUnauthorizedTo } from '@angular/fire/auth-guard';

import { AuthGuard } from './core/services/auth.guard';
import { RoleEnum } from '../models/enums/role';

export enum FeatureRoutesEnum {
  HOME = 'home',
  TERRITORIES = 'territories',
  WORK = 'work',
}

const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['/login']);

const APP_ROUTES: Routes = [
  {
    path: FeatureRoutesEnum.WORK,
    loadChildren: () => import('./features/work/work.module').then(m => m.WorkModule),
  },
  {
    path: FeatureRoutesEnum.TERRITORIES,
    loadChildren: () => import('./features/territory/territory.module').then(m => m.TerritoryModule),
    canActivate: [AuthGuard],
    data: { roles: [RoleEnum.ELDER, RoleEnum.ORGANIZER], authGuardPipe: redirectUnauthorizedToLogin },
  },
  {
    path: FeatureRoutesEnum.HOME,
    loadChildren: () => import('./features/home/home.module').then(m => m.HomeModule),
    canActivate: [AuthGuard],
    data: { roles: [RoleEnum.ELDER, RoleEnum.ORGANIZER], authGuardPipe: redirectUnauthorizedToLogin },
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

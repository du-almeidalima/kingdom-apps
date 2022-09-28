import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { redirectUnauthorizedTo } from '@angular/fire/auth-guard';

import { AuthGuard } from './core/services/auth.guard';
import { Role } from '../models/enums/role';

const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['/login']);

const APP_ROUTES: Routes = [
  {
    path: 'territories',
    loadChildren: () => import('./features/territory/territory.module').then(m => m.TerritoryModule),
    canActivate: [AuthGuard],
    data: { roles: [Role.ELDER, Role.ORGANIZER], authGuardPipe: redirectUnauthorizedToLogin },
  },
];

@NgModule({
  imports: [RouterModule.forRoot(APP_ROUTES)],
  exports: [RouterModule],
})
export class AppRoutesModule {}

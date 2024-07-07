import { RouterModule, Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { WelcomePageComponent } from './pages/welcome-page/welcome-page.component';
import { authGuard } from '../../services/auth-guard/auth.guard';
import { RoleEnum } from '../../../../models/enums/role';
import { AuthRoutesEnum } from './models/enums/auth-routes';
import { NgModule } from '@angular/core';

export const AUTH_ROUTES: Routes = [
  { path: AuthRoutesEnum.LOGIN, component: LoginPageComponent },
  {
    path: AuthRoutesEnum.WELCOME,
    component: WelcomePageComponent,
    canActivate: [authGuard],
    data: { roles: [RoleEnum.PUBLISHER] },
  },
];

@NgModule({
  imports: [RouterModule.forChild(AUTH_ROUTES)],
  exports: [RouterModule],
})
export class AuthRoutesModule {}

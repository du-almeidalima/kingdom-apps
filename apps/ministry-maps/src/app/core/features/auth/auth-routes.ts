import { Routes } from '@angular/router';

import { LoginPageComponent } from './pages/login-page/login-page.component';
import { WelcomePageComponent } from './pages/welcome-page/welcome-page.component';
import { SignInPageComponent } from './pages/sign-in-page/sign-in-page.component';
import { authGuard } from './guards/auth.guard';
import { RoleEnum } from '../../../../models/enums/role';
import { AuthRoutesEnum } from './models/enums/auth-routes';
import { NoAccountPageComponent } from './pages/no-account-page/no-account-page.component';

export const AUTH_ROUTES: Routes = [
  { path: AuthRoutesEnum.LOGIN, component: LoginPageComponent },
  {
    path: AuthRoutesEnum.WELCOME,
    component: WelcomePageComponent,
    canActivate: [authGuard],
    data: { roles: [RoleEnum.PUBLISHER] },
  },
  {
    path: AuthRoutesEnum.NO_ACCOUNT,
    component: NoAccountPageComponent,
  },
  {
    path: `${AuthRoutesEnum.SIGN_IN}/:inviteId`,
    component: SignInPageComponent,
  },
];

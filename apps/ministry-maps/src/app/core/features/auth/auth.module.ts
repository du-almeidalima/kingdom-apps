import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { CommonComponentsModule } from '@kingdom-apps/common-ui';

import { LoginPageComponent } from './pages/login-page/login-page.component';
import { AuthRepository } from './repositories/auth.repository';
import { FirebaseAuthDatasourceService } from './repositories/firebase/firebase-auth-datasource.service';
import { AuthService } from './services/auth.service';
import { WelcomePageComponent } from './pages/welcome-page/welcome-page.component';
import { RoleEnum } from '../../../../models/enums/role';
import { authGuard } from '../../services/auth.guard';

export enum AuthRoutesEnum {
  LOGIN = 'login',
  WELCOME = 'welcome',
}

const AUTH_ROUTES: Routes = [
  { path: AuthRoutesEnum.LOGIN, component: LoginPageComponent },
  {
    path: AuthRoutesEnum.WELCOME,
    component: WelcomePageComponent,
    canActivate: [authGuard],
    data: { roles: [RoleEnum.PUBLISHER] },
  },
];

@NgModule({
  declarations: [LoginPageComponent, WelcomePageComponent],
  imports: [CommonModule, RouterModule.forChild(AUTH_ROUTES), CommonComponentsModule],
  providers: [
    {
      provide: AuthRepository,
      useClass: FirebaseAuthDatasourceService,
    },
    AuthService,
  ],
})
export class AuthModule {}

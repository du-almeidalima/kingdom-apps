import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { CommonComponentsModule } from '@kingdom-apps/common';

import { LoginPageComponent } from './pages/login-page/login-page.component';
import { AuthRepository } from './repository/auth.repository';
import { FirebaseAuthDatasourceService } from './repository/firebase/firebase-auth-datasource.service';
import { UserRepository } from './repository/user.repository';
import { FirebaseUserDatasourceService } from './repository/firebase/firebase-user-datasource.service';

const AUTH_ROUTES: Routes = [{ path: '', component: LoginPageComponent }];

@NgModule({
  declarations: [LoginPageComponent],
  imports: [CommonModule, RouterModule.forChild(AUTH_ROUTES), CommonComponentsModule],
  providers: [
    {
      provide: AuthRepository,
      useClass: FirebaseAuthDatasourceService,
    },
    {
      provide: UserRepository,
      useClass: FirebaseUserDatasourceService,
    },
  ],
})
export class AuthModule {}

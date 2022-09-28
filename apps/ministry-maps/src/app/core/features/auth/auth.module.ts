import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { CommonComponentsModule } from '@kingdom-apps/common';

import { LoginPageComponent } from './pages/login-page/login-page.component';
import { AuthRepository } from './repositories/auth.repository';
import { FirebaseAuthDatasourceService } from './repositories/firebase/firebase-auth-datasource.service';
import { AuthService } from './services/auth.service';

const AUTH_ROUTES: Routes = [{ path: 'login', component: LoginPageComponent }];

@NgModule({
  declarations: [LoginPageComponent],
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

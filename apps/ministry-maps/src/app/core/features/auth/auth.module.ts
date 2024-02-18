import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CommonComponentsModule } from '@kingdom-apps/common-ui';

import { LoginPageComponent } from './pages/login-page/login-page.component';
import { AuthRepository } from './repositories/auth.repository';
import { FirebaseAuthDatasourceService } from './repositories/firebase/firebase-auth-datasource.service';
import { AuthService } from './services/auth.service';
import { WelcomePageComponent } from './pages/welcome-page/welcome-page.component';
import { AuthRoutesModule } from './auth-routes.module';

@NgModule({
  declarations: [LoginPageComponent, WelcomePageComponent],
  imports: [CommonModule, AuthRoutesModule, CommonComponentsModule],
  providers: [
    {
      provide: AuthRepository,
      useClass: FirebaseAuthDatasourceService,
    },
    AuthService,
  ],
})
export class AuthModule {}

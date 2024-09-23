import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

import { CommonComponentsModule } from '@kingdom-apps/common-ui';

import { LoginPageComponent } from './pages/login-page/login-page.component';
import { AuthRepository } from './repositories/auth.repository';
import { FirebaseAuthDatasourceService } from './repositories/firebase/firebase-auth-datasource.service';
import { AuthService } from './services/auth.service';
import { WelcomePageComponent } from './pages/welcome-page/welcome-page.component';
import { SignInPageComponent } from './pages/sign-in-page/sign-in-page.component';
import { AuthRoutesModule } from './auth-routes.module';
import { ProviderLoginButtonComponent } from './components/provider-login-button.component';
import { NoAccountPageComponent } from './pages/no-account-page/no-account-page.component';

@NgModule({
  declarations: [LoginPageComponent, WelcomePageComponent, SignInPageComponent, NoAccountPageComponent],
  imports: [CommonModule, AuthRoutesModule, CommonComponentsModule, NgOptimizedImage, ProviderLoginButtonComponent],
  providers: [
    {
      provide: AuthRepository,
      useClass: FirebaseAuthDatasourceService,
    },
    AuthService,
  ],
})
export class AuthModule {}

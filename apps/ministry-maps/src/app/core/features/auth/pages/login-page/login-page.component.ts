import { Component } from '@angular/core';
import { FIREBASE_PROVIDERS } from '../../repositories/firebase/firebase-auth-datasource.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FeatureRoutesEnum } from '../../../../../app-routes.module';
import { finalize } from 'rxjs';
import { RoleEnum } from '../../../../../../models/enums/role';
import { AuthRoutesEnum } from '../../auth.module';

@Component({
  selector: 'kingdom-apps-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
})
export class LoginPageComponent {
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onGoogleClick() {
    this.loading = true;
    this.authService
      .signInWithProvider(FIREBASE_PROVIDERS.GOOGLE)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(user => {
        if (user.role === RoleEnum.PUBLISHER) {
          this.router.navigate([AuthRoutesEnum.WELCOME]);
        } else {
          this.router.navigate([FeatureRoutesEnum.HOME]);
        }
      });
  }
}

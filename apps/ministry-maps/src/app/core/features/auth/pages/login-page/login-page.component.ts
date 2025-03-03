import { Component } from '@angular/core';
import { FIREBASE_PROVIDERS } from '../../../../../repositories/firebase/firebase-auth-datasource.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FeatureRoutesEnum } from '../../../../../app-routes';
import { finalize } from 'rxjs';
import { RoleEnum } from '../../../../../../models/enums/role';
import { AuthRoutesEnum } from '../../models/enums/auth-routes';
import { CardComponent } from '@kingdom-apps/common-ui';
import { ProviderLoginButtonComponent } from '../../components/provider-login-button.component';

@Component({
  selector: 'kingdom-apps-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  imports: [CardComponent, ProviderLoginButtonComponent],
})
export class LoginPageComponent {
  protected readonly FIREBASE_PROVIDERS = FIREBASE_PROVIDERS;

  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  handleProviderLoginClick(firebaseProvider: FIREBASE_PROVIDERS) {
    this.loading = true;
    this.authService
      .signInWithProvider(firebaseProvider)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(user => {
        if (!user) {
          this.router.navigate([AuthRoutesEnum.NO_ACCOUNT]);
          return;
        }

        if (user.role === RoleEnum.PUBLISHER) {
          this.router.navigate([AuthRoutesEnum.WELCOME]);
        } else {
          this.router.navigate([FeatureRoutesEnum.HOME]);
        }
      });
  }
}

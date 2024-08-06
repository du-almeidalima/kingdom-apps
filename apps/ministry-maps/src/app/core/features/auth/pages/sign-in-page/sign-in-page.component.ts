import { Component, OnInit } from '@angular/core';
import { FIREBASE_PROVIDERS } from '../../repositories/firebase/firebase-auth-datasource.service';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FeatureRoutesEnum } from '../../../../../app-routes.module';
import { finalize } from 'rxjs';
import { RoleEnum } from '../../../../../../models/enums/role';
import { AuthRoutesEnum } from '../../models/enums/auth-routes';

@Component({
  selector: 'kingdom-apps-sign-in-page',
  templateUrl: './sign-in-page.component.html',
  styleUrls: ['./sign-in-page.component.scss'],
})
export class SignInPageComponent implements OnInit {
  protected readonly FIREBASE_PROVIDERS = FIREBASE_PROVIDERS;
  loading = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    console.log(this.route.snapshot.params['inviteId']);
  }


  handleProviderLoginClick(provider: FIREBASE_PROVIDERS) {
    this.loading = true;
    this.authService
      .signInWithProvider(provider, true)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(user => {
        if (!user) {
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

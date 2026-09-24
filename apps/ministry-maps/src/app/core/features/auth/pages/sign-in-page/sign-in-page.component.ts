import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FIREBASE_PROVIDERS } from '../../../../../repositories/firebase/firebase-auth-datasource.service';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FeatureRoutesEnum } from '../../../../../app-routes';
import { catchError, EMPTY, finalize } from 'rxjs';
import { RoleEnum } from '../../../../../../models/enums/role';
import { AuthRoutesEnum } from '../../models/enums/auth-routes';
import { InvitationLinkRepository } from '../../../../../repositories/invitation-link.repository';
import { InvitationLink } from '../../../../../../models/invitation-link';
import { AuthErrorEnum, CreateUserConfig } from '../../../../../repositories/auth.repository';
import { CardComponent } from '@kingdom-apps/common-ui';
import { NgOptimizedImage } from '@angular/common';
import { ProviderLoginButtonComponent } from '../../components/provider-login-button.component';

@Component({
  selector: 'kingdom-apps-sign-in-page',
  templateUrl: './sign-in-page.component.html',
  styleUrls: ['./sign-in-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, NgOptimizedImage, ProviderLoginButtonComponent],
})
export class SignInPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly FIREBASE_PROVIDERS = FIREBASE_PROVIDERS;

  inviteRepository = inject(InvitationLinkRepository);

  loading = signal(false);
  errorCode = signal<'' | 'INVALID_LINK' | 'INVALID_EMAIL'>('');
  invite = signal<InvitationLink | undefined>(undefined);

  ngOnInit(): void {
    this.loading.set(true);

    this.inviteRepository
      .getById(this.route.snapshot.params['inviteId'])
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
        catchError(() => {
          return EMPTY;
        }),
      )
      .subscribe((invite) => {
        if (!invite || !invite.isValid) {
          this.errorCode.set('INVALID_LINK');
          return;
        }

        this.invite.set(invite);
      });
  }

  handleProviderLoginClick(provider: FIREBASE_PROVIDERS) {
    this.loading.set(true);

    const invite = this.invite();
    if (!invite) {
      return;
    }
    const userConfig: CreateUserConfig = {
      inviteId: invite.id,
      role: invite.role,
      email: invite.email,
      congregation: invite.congregation,
    };

    this.authService
      .signInWithProvider(provider, true, userConfig)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
        catchError((err) => {
          if (err?.message === AuthErrorEnum.INVALID_EMAIL) {
            this.errorCode.set('INVALID_EMAIL');
          }

          return EMPTY;
        }),
      )
      .subscribe((user) => {
        // this.invite should never be null, but TypeScript seems to have trouble inferring that it is not null
        // Maybe because this method is async
        if (!user || !this.invite()) {
          return;
        }

        // The invite is consumed atomically by the provisionUserFromInvite callable.

        if (user.role === RoleEnum.PUBLISHER) {
          this.router.navigate([AuthRoutesEnum.WELCOME]);
        } else {
          this.router.navigate([FeatureRoutesEnum.HOME]);
        }
      });
  }
}

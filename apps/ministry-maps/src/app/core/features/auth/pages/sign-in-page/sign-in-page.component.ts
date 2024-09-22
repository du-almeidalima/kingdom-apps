import { Component, inject, OnInit } from '@angular/core';
import { FIREBASE_PROVIDERS } from '../../repositories/firebase/firebase-auth-datasource.service';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FeatureRoutesEnum } from '../../../../../app-routes.module';
import { catchError, EMPTY, finalize } from 'rxjs';
import { RoleEnum } from '../../../../../../models/enums/role';
import { AuthRoutesEnum } from '../../models/enums/auth-routes';
import { InvitationLinkRepository } from '../../../../../repositories/invitation-link.repository';
import { InvitationLink } from '../../../../../../models/invitation-link';
import { AuthErrorEnum, CreateUserConfig } from '../../repositories/auth.repository';
import { InviteBO } from '../../../../../features/users/bo/invite/invite-bo.service';

@Component({
  selector: 'kingdom-apps-sign-in-page',
  templateUrl: './sign-in-page.component.html',
  styleUrls: ['./sign-in-page.component.scss'],
})
export class SignInPageComponent implements OnInit {
  protected readonly FIREBASE_PROVIDERS = FIREBASE_PROVIDERS;

  inviteRepository = inject(InvitationLinkRepository);

  loading = false;
  errorCode: '' | 'INVALID_LINK' | 'INVALID_EMAIL' = '';
  invite: InvitationLink | undefined;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly inviteBO: InviteBO
  ) {}

  ngOnInit(): void {
    this.loading = true;

    this.inviteRepository
      .getById(this.route.snapshot.params['inviteId'])
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        catchError(() => {
          return EMPTY;
        })
      )
      .subscribe(invite => {
        if (!invite || !invite.isValid) {
          this.errorCode = 'INVALID_LINK';
          return;
        }

        this.invite = invite;
      });
  }

  handleProviderLoginClick(provider: FIREBASE_PROVIDERS) {
    this.loading = true;

    if (!this.invite) {
      return;
    }

    const userConfig: CreateUserConfig = {
      role: this.invite.role,
      email: this.invite.email,
      congregation: this.invite.congregation,
    };

    this.authService
      .signInWithProvider(provider, true, userConfig)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        catchError(err => {
          if (err?.message === AuthErrorEnum.INVALID_EMAIL) {
            this.errorCode = 'INVALID_EMAIL';
          }

          return EMPTY;
        })
      )
      .subscribe(user => {
        // this.invite should never be null, but TypeScript seems to have trouble inferring that it is not null
        // Maybe because this method is async
        if (!user || !this.invite) {
          return;
        }

        // We don't need the response of this operation, it's a fire and forget call to consume th e link
        this.inviteBO.consumeInviteLink(this.invite).subscribe();

        if (user.role === RoleEnum.PUBLISHER) {
          this.router.navigate([AuthRoutesEnum.WELCOME]);
        } else {
          this.router.navigate([FeatureRoutesEnum.HOME]);
        }
      });
  }
}

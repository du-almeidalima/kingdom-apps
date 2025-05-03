import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { AuthRepository, CreateUserConfig } from '../../../../repositories/auth.repository';
import { FIREBASE_PROVIDERS } from '../../../../repositories/firebase/firebase-auth-datasource.service';
import { UserStateService } from '../../../../state/user.state.service';
import { User } from '../../../../../models/user';
import { Router } from '@angular/router';
import { AuthUserStateService } from '@kingdom-apps/common-ui';
import { AuthRoutesEnum } from '../models/enums/auth-routes';

@Injectable({ providedIn: 'root'})
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userState: UserStateService,
    private readonly authUserState: AuthUserStateService,
    private readonly router: Router
  ) {
    // Updates the UserState whenever the authStateChanges
    this.authRepository.authStateChanged().subscribe(authStateChange => {

      // User was logged in, but its auth state has changed to log out
      if (userState.isLoggedIn && !authStateChange) {
        this.userState.setUser(null);
        this.authUserState.setUser(null);
        // TODO: Maybe it would a nice UX to have a intermediate screen telling them that we're logging them out
        this.router.navigate([AuthRoutesEnum.LOGIN]);
      }
    });
  }

  /**
   * Logs the user using a {@link FIREBASE_PROVIDERS}.
   * @param provider The provider to log the user against (e.g. Google or Microsoft).
   * @param createUser Boolean that indicates if the logged user doesn't exist already, if it should be created.
   * @param createUserConfiguration When provided, will use the configuration found in here to set the user values.
   * This data is usually from the {@link InvitationLink}
   */
  signInWithProvider(provider: FIREBASE_PROVIDERS, createUser = false, createUserConfiguration?: CreateUserConfig): Observable<User | void> {
    return this.authRepository.signInWithProvider(provider, createUser, createUserConfiguration).pipe(
      tap(userRes => {
        if (!userRes) {
          return;
        }

        this.userState.setUser(userRes);
        this.authUserState.setUser({
          roles: [userRes.role],
          name: userRes.name,
        });
      })
    );
  }

  logOut() {
    this.authRepository.logOut();
  }
}

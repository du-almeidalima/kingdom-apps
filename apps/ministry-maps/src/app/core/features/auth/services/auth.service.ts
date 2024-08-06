import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { AuthRepository } from '../repositories/auth.repository';
import { FIREBASE_PROVIDERS } from '../repositories/firebase/firebase-auth-datasource.service';
import { UserStateService } from '../../../../state/user.state.service';
import { User } from '../../../../../models/user';
import { Router } from '@angular/router';
import { AuthUserStateService } from '@kingdom-apps/common-ui';
import { AuthRoutesEnum } from '../models/enums/auth-routes';

@Injectable({
  providedIn: 'root',
})
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

  signInWithProvider(provider: FIREBASE_PROVIDERS, createUser = false): Observable<User | null> {
    return this.authRepository.signInWithProvider(provider, createUser).pipe(
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

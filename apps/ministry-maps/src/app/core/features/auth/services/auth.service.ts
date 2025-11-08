import { Injectable, signal } from '@angular/core';
import { finalize, Observable, tap } from 'rxjs';

import { AuthRepository, CreateUserConfig } from '../../../../repositories/auth.repository';
import {
  FIREBASE_PROVIDERS,
  FirebaseAuthDatasourceService,
} from '../../../../repositories/firebase/firebase-auth-datasource.service';
import { UserStateService } from '../../../../state/user.state.service';
import { User } from '../../../../../models/user';
import { Router } from '@angular/router';
import { AuthUserStateService } from '@kingdom-apps/common-ui';
import { AuthRoutesEnum } from '../models/enums/auth-routes';
import { FirebaseUserDatasourceService } from '../../../../repositories/firebase/firebase-user-datasource.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isAuthenticating = signal(false);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userState: UserStateService,
    private readonly authUserState: AuthUserStateService,
    private readonly firebaseAuthDatasourceService: FirebaseAuthDatasourceService,
    private readonly userRepository: FirebaseUserDatasourceService,
    private readonly router: Router
  ) {
    // Updates the UserState whenever the authStateChanges
    this.authRepository.authStateChanged().subscribe((authStateChange) => {
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
  signInWithProvider(
    provider: FIREBASE_PROVIDERS,
    createUser = false,
    createUserConfiguration?: CreateUserConfig
  ): Observable<User | void> {
    return this.authRepository.signInWithProvider(provider, createUser, createUserConfiguration).pipe(
      tap((userRes) => {
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

  /**
   * Resolves and updates the current user from authentication.
   * Fetches the authenticated user and updates both user state services.
   *
   * @remarks This will first return the user from cache and then update the state afterward with the most up to date
   * information about the user and its congregation.
   */
  resolveUserFromAuthProvider(): Observable<User | undefined> {
    this.isAuthenticating.set(true);

    return this.firebaseAuthDatasourceService.getUserFromAuthentication().pipe(
      tap((user) => {
        if (user) {
          this.userState.setUser(user);
          this.authUserState.setUser({ roles: [user.role], name: user.name });

          // Fetch fresh data from the server after an initially cached load
          this.refreshUserFromServer(user.id);
        }
      }),
      finalize(() => {
        this.isAuthenticating.set(false);
      })
    );
  }

  /**
   * Fetches the most up-to-date user information from the server and updates the state.
   * This bypasses the cache to ensure fresh data.
   */
  private refreshUserFromServer(userId: string): void {
    this.userRepository.getById(userId).subscribe((user) => {

      if (user) {
        this.userState.setUser(user);
        this.authUserState.setUser({ roles: [user.role], name: user.name });
      }
    });
  }
}

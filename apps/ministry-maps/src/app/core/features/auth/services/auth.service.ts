import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { AuthRepository } from '../repositories/auth.repository';
import { FIREBASE_PROVIDERS } from '../repositories/firebase/firebase-auth-datasource.service';
import { UserStateService } from '../../../../state/user.state.service';
import { User } from '../../../../../models/user';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userState: UserStateService,
    private readonly router: Router
  ) {
    // Updates the UserState whenever the authStateChanges
    this.authRepository.authStateChanged().subscribe(isUserLoggedIn => {
      if (!isUserLoggedIn) {
        this.userState.setUser(null);
        // TODO: Maybe it would a nice UX to have a intermediate screen telling them that we're logging them out
        this.router.navigate(['/login']);
      }
    });
  }

  signInWithProvider(provider: FIREBASE_PROVIDERS): Observable<User> {
    return this.authRepository.signInWithProvider(provider).pipe(
      tap(userRes => {
        this.userState.setUser(userRes);
      })
    );
  }

  logOut() {
    this.authRepository.logOut();
  }
}

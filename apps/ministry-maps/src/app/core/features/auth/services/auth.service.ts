import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { AuthRepository } from '../repositories/auth.repository';
import { FIREBASE_PROVIDERS } from '../repositories/firebase/firebase-auth-datasource.service';
import { UserStateService } from '../../../../state/user.state.service';
import { User } from '../../../../../models/user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private readonly authRepository: AuthRepository, private readonly userState: UserStateService) {}

  signInWithProvider(provider: FIREBASE_PROVIDERS): Observable<User> {
    return this.authRepository.signInWithProvider(provider).pipe(
      tap(userRes => {
        this.userState.setUser(userRes);
      })
    );
  }
}

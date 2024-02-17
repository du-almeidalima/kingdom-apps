import { User } from '../../../models/user';
import { EMPTY, Observable, of } from 'rxjs';
import { AuthRepository } from '../../../app/core/features/auth/repositories/auth.repository';
import { userMockBuilder } from './user.mock';

// MOCK CLASSES
export class AuthRepositoryMock implements AuthRepository {
  authStateChanged(): Observable<boolean> {
    return of(true);
  }

  logOut(): Observable<void> {
    return EMPTY;
  }

  signInWithProvider(providers?: string): Observable<User> {
    return of(userMockBuilder({}));
  }
}


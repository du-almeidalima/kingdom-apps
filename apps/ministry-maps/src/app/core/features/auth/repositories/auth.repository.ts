import { Observable } from 'rxjs';
import { User } from '../../../../../models/user';

export abstract class AuthRepository {
  abstract signInWithProvider(providers?: string): Observable<User>;

  /**
   * Emits a boolean whenever the User auth state changes based on its authentication status
   * (logged in = true and logged out = false)
   */
  abstract authStateChanged(): Observable<boolean>;
  abstract logOut(): Observable<void>;
}

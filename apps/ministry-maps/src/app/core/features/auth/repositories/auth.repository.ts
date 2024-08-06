import { Observable } from 'rxjs';
import { User } from '../../../../../models/user';

export abstract class AuthRepository {
  /**
   * Logs the user in using the given provider.
   * @param providers the provider that will log user in. Defined in {@link FIREBASE_PROVIDERS}.
   * @param createUser when true, if the user doesn't exist, it will create a User record in the database.
   */
  abstract signInWithProvider(providers: string, createUser: boolean): Observable<User | null>;

  /**
   * Emits a boolean whenever the User auth state changes based on its authentication status
   * (logged in = true and logged out = false)
   */
  abstract authStateChanged(): Observable<boolean>;
  abstract logOut(): Observable<void>;
}

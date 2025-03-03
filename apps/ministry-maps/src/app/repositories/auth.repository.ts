import { Observable } from 'rxjs';
import { User } from '../../models/user';
import { RoleEnum } from '../../models/enums/role';
import { Congregation } from '../../models/congregation';

export enum AuthErrorEnum {
  INVALID_EMAIL= 'INVALID_EMAIL',
  INVALID_CREATE_USER_DATA= 'INVALID_CREATE_USER_DATA',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/** Configuration and values for the user that's being created. Usually from the {@link InvitationLink}. */
export type CreateUserConfig = {
  email?: string;
  role: RoleEnum;
  congregation: Congregation;
}

export abstract class AuthRepository {
  /**
   * Logs the user in using the given provider.
   * @param providers the provider that will log user in. Defined in {@link FIREBASE_PROVIDERS}.
   * @param createUser when true, if the user doesn't exist, it will create a User record in the database.
   * @param createUserConfig When provided, will use the configuration found in here to set the user values.
   *
   */
  abstract signInWithProvider(providers: string, createUser: boolean, createUserConfig?: CreateUserConfig): Observable<User | void>;

  /**
   * Emits a boolean whenever the User auth state changes based on its authentication status
   * (logged in = true and logged out = false)
   */
  abstract authStateChanged(): Observable<boolean>;
  abstract logOut(): Observable<void>;
}

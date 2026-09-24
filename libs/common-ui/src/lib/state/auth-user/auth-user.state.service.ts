import { Injectable, signal } from '@angular/core';
import { AuthUser } from '../../models/auth-user';

/** This service contains generic information about the user and its roles.
 *
 * Useful for managing authentication/authorization for non-domain specific parts of the application.
 * Example: common-ui
 */
@Injectable({
  providedIn: 'root',
})
export class AuthUserStateService {
  private readonly userSignal = signal<AuthUser | null>(null);

  /** Read-only signal with the current auth user. */
  public readonly user = this.userSignal.asReadonly();

  public get currentUser() {
    return this.userSignal();
  }

  public get isLoggedIn() {
    return !!this.userSignal();
  }

  setUser(user: AuthUser | null) {
    this.userSignal.set(user);
  }
}

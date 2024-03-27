import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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
  private userSubject: BehaviorSubject<AuthUser | null> = new BehaviorSubject<AuthUser | null>(null);

  public $user = this.userSubject.asObservable();

  public get currentUser() {
    return this.userSubject.getValue();
  }

  public get isLoggedIn() {
    return !!this.userSubject.getValue();
  }

  setUser(user: AuthUser | null) {
    this.userSubject.next(user);
  }
}

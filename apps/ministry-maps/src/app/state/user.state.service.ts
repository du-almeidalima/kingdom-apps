import { Injectable, signal } from '@angular/core';
import { User } from '../../models/user';

@Injectable({
  providedIn: 'root',
})
export class UserStateService {
  private readonly userSignal = signal<User | null>(null);

  /** Read-only signal with the current user. */
  public readonly user = this.userSignal.asReadonly();

  public get currentUser() {
    return this.userSignal();
  }

  public get isLoggedIn() {
    return !!this.userSignal();
  }

  setUser(user: User | null) {
    this.userSignal.set(user);
  }
}

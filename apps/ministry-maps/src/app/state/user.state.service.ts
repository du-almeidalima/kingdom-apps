import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../../models/user';

@Injectable({
  providedIn: 'root',
})
export class UserStateService {
  private userSubject: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);

  public $user = this.userSubject.asObservable();

  public get currentUser() {
    return this.userSubject.getValue();
  }

  setUser(user: User | null) {
    this.userSubject.next(user);
  }
}

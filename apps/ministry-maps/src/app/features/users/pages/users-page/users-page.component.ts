import { Component, OnDestroy, OnInit } from '@angular/core';
import { UserRepository } from 'apps/ministry-maps/src/app/repositories/user.repository';
import { FirebaseUserModel } from 'apps/ministry-maps/src/models/firebase/firebase-user-model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'kingdom-apps-users-page',
  templateUrl: './users-page.component.html',
  styleUrls: ['./users-page.component.scss'],
})
export class UsersPageComponent implements OnInit, OnDestroy {
  usersSubscription: Subscription | undefined;
  users: FirebaseUserModel[] = [];

  constructor(private readonly usersRepository: UserRepository) {}

  ngOnInit(): void {
    console.log('initing');
    this.usersSubscription = this.usersRepository.getAll().subscribe(users => (this.users = users));
  }

  ngOnDestroy(): void {
    console.log('destroying');
    this.usersSubscription?.unsubscribe();
  }
}

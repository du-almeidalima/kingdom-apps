import { Injectable } from '@angular/core';
import { from, Observable, of, switchMap } from 'rxjs';
import { UserRepository } from '../user.repository';
import { User } from '../../../../../../models/user';
import { collection, CollectionReference, doc, docData, Firestore, setDoc } from '@angular/fire/firestore';
import { Role } from '../../../../../../models/enums/role';

@Injectable({
  providedIn: 'root',
})
export class FirebaseUserDatasourceService implements UserRepository {
  private readonly usersCollection: CollectionReference;

  constructor(private readonly firestore: Firestore) {
    this.usersCollection = collection(this.firestore, 'users');
  }

  getById(id: string): Observable<User | undefined> {
    const userReference = doc(this.firestore, `users/${id}`);

    return docData(userReference, {
      idField: 'id',
    }) as Observable<User | undefined>;
  }

  put(partialUser: User): Observable<User> {
    const user: User = {
      ...partialUser,
      role: Role.PUBLISHER,
      congregationId: 'NONE',
    };

    const setPromise = setDoc(doc(this.usersCollection, user.id), user);

    return from(setPromise).pipe(switchMap(() => of(user)));
  }
}

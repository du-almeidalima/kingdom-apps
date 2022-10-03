import { Injectable } from '@angular/core';
import { from, map, Observable, of, switchMap } from 'rxjs';
import { UserRepository } from '../user.repository';
import { User } from '../../../models/user';
import {
  collection,
  CollectionReference,
  doc,
  DocumentReference,
  Firestore,
  getDocFromServer,
  setDoc,
} from '@angular/fire/firestore';
import { Role } from '../../../models/enums/role';
import { FirebaseUserModel } from '../../../models/firebase/firebase-user-model';
import { Congregation } from '../../../models/congregation';

@Injectable({
  providedIn: 'root',
})
export class FirebaseUserDatasourceService implements UserRepository {
  private readonly usersCollection: CollectionReference;

  constructor(private readonly firestore: Firestore) {
    this.usersCollection = collection(this.firestore, 'users');
  }

  getById(id: string): Observable<User | undefined> {
    const userReference = doc(this.firestore, `users/${id}`) as DocumentReference<FirebaseUserModel>;

    const userRes = from(getDocFromServer<FirebaseUserModel>(userReference)).pipe(
      map(userDocSnapshot => {
        return userDocSnapshot.data();
      })
    );

    return userRes.pipe(
      switchMap(user => {
        const EMPTY_CONGREGATION: Congregation = {
          id: '',
          name: '',
          locatedOn: '',
          cities: [],
        };

        if (!user) {
          return of(undefined);
        }

        if (!user?.congregation) {
          const userWithNoCongregation: User = { ...user, congregation: EMPTY_CONGREGATION };

          return of(userWithNoCongregation);
        }

        // Resolving FireBase Congregation Reference
        return from(getDocFromServer<Congregation>(user.congregation)).pipe(
          map(congregationDocSnapshot => {
            if (!congregationDocSnapshot.exists()) {
              // User with congregation deleted
              return { ...user, congregation: EMPTY_CONGREGATION };
            }

            return { ...user, congregation: { ...congregationDocSnapshot.data(), id: congregationDocSnapshot.id } };
          })
        );
      })
    );
  }

  put(partialUser: User): Observable<User> {
    const user: User = {
      ...partialUser,
      role: Role.PUBLISHER,
      congregation: undefined,
    };

    const setPromise = setDoc(doc(this.usersCollection, user.id), user);

    return from(setPromise).pipe(switchMap(() => of(user)));
  }
}

import { Injectable } from '@angular/core';
import { from, map, Observable, of, switchMap } from 'rxjs';
import { UserRepository } from '../user.repository';
import { User } from '../../../models/user';
import { collection, CollectionReference, doc, docData, Firestore, setDoc } from '@angular/fire/firestore';
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
    const userReference = doc(this.firestore, `users/${id}`);

    const userRes = docData(userReference, {
      idField: 'id',
    }) as Observable<FirebaseUserModel | undefined>;

    return userRes.pipe(
      switchMap(user => {
        if (!user) {
          return of(undefined);
        }

        if (!user?.congregation) {
          const userWithNoCongregation: User = {
            ...user,
            congregation: {
              id: '',
              name: '',
              locatedOn: '',
              cities: [],
              territories: [],
            },
          };

          return of(userWithNoCongregation);
        }

        // Resolving FireBase Congregation Reference
        return docData<Congregation>(user.congregation, { idField: 'id' }).pipe(
          map(congregation => {
            return { ...user, congregation };
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

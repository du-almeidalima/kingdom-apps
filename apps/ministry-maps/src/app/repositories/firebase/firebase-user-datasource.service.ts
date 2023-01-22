import { Injectable } from '@angular/core';
import { forkJoin, from, map, Observable, of, switchMap } from 'rxjs';
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
import { RoleEnum } from '../../../models/enums/role';
import { FirebaseUserModel } from '../../../models/firebase/firebase-user-model';
import { Congregation } from '../../../models/congregation';

@Injectable({
  providedIn: 'root',
})
export class FirebaseUserDatasourceService implements UserRepository {
  private readonly usersCollection: CollectionReference<FirebaseUserModel>;

  constructor(private readonly firestore: Firestore) {
    this.usersCollection = collection(this.firestore, 'users') as CollectionReference<FirebaseUserModel>;
  }

  /**
   * Resolves a user congregation reference by id or by reference
   * @param congregation
   * @private
   */
  private resolveUserCongregationReference(
    congregation: DocumentReference<Congregation>
  ): Observable<Congregation | undefined> {
    return from(getDocFromServer<Congregation>(congregation)).pipe(
      map(congregationDocSnapshot => {
        return congregationDocSnapshot.data();
      })
    );
  }

  getById(id: string): Observable<User | undefined> {
    const userReference = doc(this.usersCollection, id);

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
        return this.resolveUserCongregationReference(user.congregation).pipe(
          map(congregation => {
            if (!congregation) {
              // User with congregation deleted
              return { ...user, congregation: EMPTY_CONGREGATION };
            }

            // Overriding congregation reference with congregation data
            return { ...user, congregation: { ...congregation } };
          })
        );
      })
    );
  }

  put(partialUser: FirebaseUserModel): Observable<User> {
    const user: FirebaseUserModel = {
      ...partialUser,
      role: RoleEnum.PUBLISHER,
    };

    const setPromise = setDoc(doc(this.usersCollection, user.id), user);
    const user$ = from(setPromise);

    return forkJoin([user$, this.resolveUserCongregationReference(user.congregation)]).pipe(
      map(([_, congregation]) => {
        return { ...user, congregation };
      })
    );
  }
}

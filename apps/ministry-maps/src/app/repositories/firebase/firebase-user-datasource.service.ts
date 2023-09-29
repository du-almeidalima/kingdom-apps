import { Injectable } from '@angular/core';
import {
  collection,
  CollectionReference,
  doc,
  DocumentReference,
  Firestore, getDoc,
  getDocFromCache,
  getDocFromServer,
  setDoc,
} from '@angular/fire/firestore';
import { catchError, forkJoin, from, map, Observable, of, switchMap } from 'rxjs';

import { Congregation } from '../../../models/congregation';
import { RoleEnum } from '../../../models/enums/role';
import { FirebaseUserModel } from '../../../models/firebase/firebase-user-model';
import { User } from '../../../models/user';
import { UserRepository } from '../user.repository';

@Injectable({
  providedIn: 'root',
})
export class FirebaseUserDatasourceService implements UserRepository {
  private readonly usersCollection: CollectionReference<FirebaseUserModel>;

  constructor(private readonly firestore: Firestore) {
    this.usersCollection = collection(this.firestore, 'users') as CollectionReference<FirebaseUserModel>;
  }

  getById(id: string): Observable<User | undefined> {
    const userReference = doc(this.usersCollection, id);
    // Since the User isn't something that changes frequently, fetching from cache to increase Performance
    const cachedUserDoc = from(getDoc(userReference));

    const userSnapshot = cachedUserDoc.pipe(
      catchError(err => {
        console.warn(`Cache for User not found: `, err);
        return of(null)
      }),
      switchMap(userDocSnapshot => {
        // Cache user found, returning it
        if (userDocSnapshot) {
          return of(userDocSnapshot)
        }

        // Fetching from server
        return from(getDocFromServer<FirebaseUserModel>(userReference));
      })
    );

    return userSnapshot.pipe(
      map(userDocSnapshot => {
        return userDocSnapshot.data();
      }),
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

  /**
   * Resolves a user congregation reference by id or by reference
   * @param congregation
   * @private
   */
  private resolveUserCongregationReference(
    congregation: DocumentReference<Congregation>
  ): Observable<Congregation | undefined> {

    // Since Congregation isn't something that changes frequently, fetching from cache to increase Performance
    const cachedCongregationSnapshot = from(getDocFromCache(congregation));

    return cachedCongregationSnapshot
      .pipe(
        catchError(err => {
          console.warn(`Cache for Congregation not found: `, err);
          return of(null)
        }),
        switchMap(cachedCongregationRes => {
          // Cache user found, returning it
          if (cachedCongregationRes) {
            return of(cachedCongregationRes);
          }

          // Fetching from server
          return from(getDocFromServer<Congregation>(congregation));
        }),
        map(congregationDocSnapshot => {
          if (!congregationDocSnapshot.exists()) {
            return undefined;
          }

          return { ...congregationDocSnapshot.data(), id: congregationDocSnapshot.id };
        })
      )
  }
}

import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  CollectionReference,
  deleteDoc,
  doc,
  DocumentReference,
  Firestore,
  getDoc,
  getDocFromServer,
  query,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { catchError, forkJoin, from, map, Observable, of, switchMap } from 'rxjs';

import { Congregation } from '../../../models/congregation';
import { RoleEnum } from '../../../models/enums/role';
import { FirebaseUserModel } from '../../../models/firebase/firebase-user-model';
import { User } from '../../../models/user';
import { UserRepository } from '../user.repository';
import { congregationConverter, FirebaseCongregationModel } from '../../../models/firebase/firebase-congregation-model';
import { FirebaseCongregationDatasourceService } from './firebase-congregation-datasource.service';
import { Functions, httpsCallableData } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root',
})
export class FirebaseUserDatasourceService implements UserRepository {
  static readonly COLLECTION_NAME = 'users';
  private readonly userCollection: CollectionReference<User, FirebaseUserModel>;
  private readonly congregationCollection: CollectionReference<Congregation, FirebaseCongregationModel>;
  private readonly deleteUserFn: (userId: string) => Observable<void>;

  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,

  ) {
    // USERS COLLECTION
    this.userCollection = collection(
      this.firestore,
      FirebaseUserDatasourceService.COLLECTION_NAME,
    ) as CollectionReference<User, FirebaseUserModel>;

    // CONGREGATION COLLECTION
    this.congregationCollection = collection(
      this.firestore,
      FirebaseCongregationDatasourceService.COLLECTION_NAME,
    ).withConverter(congregationConverter) as CollectionReference<Congregation, FirebaseCongregationModel>;

    // FUNCTIONS
    this.deleteUserFn = httpsCallableData(this.functions, 'deleteUser');
  }

  getById(id: string): Observable<User | undefined> {
    const userReference = doc(this.userCollection, id);
    // Since the User isn't something that changes frequently, fetching from cache to increase Performance
    const cachedUserDoc = from(getDoc(userReference));

    const userSnapshot = cachedUserDoc.pipe(
      catchError(err => {
        console.warn(`Cache for User not found: `, err);
        return of(null);
      }),
      switchMap(userDocSnapshot => {
        // Cache user found, returning it
        if (userDocSnapshot) {
          return of(userDocSnapshot);
        }

        // Fetching from server
        return from(getDocFromServer(userReference));
      }),
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
        const congregationDocRef = this.createCongregationDoc(user.congregation.id);
        return FirebaseCongregationDatasourceService.resolveUserCongregationReference(congregationDocRef).pipe(
          map(congregation => {
            if (!congregation) {
              // User with congregation deleted
              return { ...user, congregation: EMPTY_CONGREGATION };
            }

            // Overriding congregation reference with congregation data
            return { ...user, congregation: { ...congregation } };
          }),
        );
      }),
    );
  }

  put(partialUser: FirebaseUserModel): Observable<User> {
    const user: FirebaseUserModel = {
      ...partialUser,
      role: partialUser.role ?? RoleEnum.PUBLISHER,
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const setPromise = setDoc(doc(this.userCollection, user.id), user);
    const user$ = from(setPromise);

    // Resolving FireBase Congregation Reference
    const congregationDocRef = this.createCongregationDoc(user.congregation.id);
    return forkJoin([
      user$,
      FirebaseCongregationDatasourceService.resolveUserCongregationReference(congregationDocRef)
    ]).pipe(
      map(([_, congregation]) => {
        return { ...user, congregation };
      }),
    );
  }

  /** Basically a wrapper around {@link FirebaseUserDatasourceService#put} to map to a FirebaseModel */
  update(user: User): Observable<User> {

    if (!user.congregation?.id) {
      throw new Error('User with no congregation! Aborting update.');
    }

    const firebaseUser: FirebaseUserModel = {
      ...user,
      congregation: doc(this.firestore, `/${FirebaseCongregationDatasourceService.COLLECTION_NAME}/${user.congregation?.id}`) as DocumentReference<Congregation, FirebaseCongregationModel>,
    };

    return this.put(firebaseUser);
  }

  delete(userId: string): Observable<void> {
    const deletePromise = deleteDoc(doc(this.userCollection, userId));
    try {
      this.deleteUserFn(userId);
    } catch (e) {
      console.error(`Error calling deleteUserFn Cloud Function for ${userId}`);
    }

    return from(deletePromise);
  }

  getAllByCongregation(congregationId: string): Observable<User[]> {
    const congregationDocRef = this.createCongregationDoc(congregationId);
    const q = query(
      this.userCollection,
      where('congregation', '==', congregationDocRef),
    );

    // This is a little nested. However, it's to avoid performing multiple calls to FireStore to resolve the congregation ref
    // Once the Users have been fetched, we resolve the congregationRef used as a query param only once and map to all users.
    return from(collectionData(q))
      .pipe(
        switchMap(users => {
          return FirebaseCongregationDatasourceService.resolveUserCongregationReference(congregationDocRef)
            .pipe(
              map(congregation => {
                return users.map(u => {
                  u.congregation = congregation;
                  return u;
                });
              }),
            );
        }),
      );
  }

  // TODO: This should be simpler... Maybe the collections should defined in a saperated file so they could be
  //  reused on other DataSource classes
  private createCongregationDoc(congregationId: string) {
    return doc(this.congregationCollection, congregationId);
  }
}

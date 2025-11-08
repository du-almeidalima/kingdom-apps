import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  CollectionReference,
  deleteDoc,
  doc,
  DocumentReference,
  Firestore,
  getDocFromCache,
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
import { FirebaseCongregationModel } from '../../../models/firebase/firebase-congregation-model';
import { FirebaseCongregationDatasourceService } from './firebase-congregation-datasource.service';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { FirebaseDatasource } from './firebase-datasource';
import { environment } from '../../../environments/environment';
import { LoggerService } from '../../shared/services/logger/logger.service';

@Injectable({
  providedIn: 'root',
})
export class FirebaseUserDatasourceService implements UserRepository, FirebaseDatasource<User> {
  static readonly COLLECTION_NAME = 'users';

  private readonly userCollection: CollectionReference<User, FirebaseUserModel>;
  private readonly deleteUserFn: (userId: string) => Observable<void>;
  private readonly loggerService = inject(LoggerService);

  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
    private readonly congregationDatasourceService: FirebaseCongregationDatasourceService
  ) {
    // USERS COLLECTION
    this.userCollection = collection(
      this.firestore,
      FirebaseUserDatasourceService.COLLECTION_NAME
    ) as CollectionReference<User, FirebaseUserModel>;

    // FUNCTIONS
    this.deleteUserFn = httpsCallableData(this.functions, 'deleteUser');
  }

  createDocumentRef(id: string): DocumentReference<User> {
    return doc(this.userCollection, id);
  }

  getById(id: string): Observable<User | undefined> {
    const userReference = doc(this.userCollection, id);

    return from(getDocFromServer(userReference)).pipe(
      map((userDocSnapshot) => userDocSnapshot.data()),
      switchMap((user) => this.resolveUser(user, { useCache: false }))
    );
  }

  /**
   * Gets user from cache first, falling back to server if not cached.
   */
  getByIdFromCache(id: string): Observable<User | undefined> {
    const userReference = doc(this.userCollection, id);

    // Try to get from cache only
    const cachedUserDoc = from(getDocFromCache(userReference));

    return cachedUserDoc.pipe(
      map((userDocSnapshot) => {
        // If it came from a server, still return it
        return userDocSnapshot.data();
      }),
      switchMap((user) => this.resolveUser(user, { useCache: true })),
      catchError((err) => {
        console.warn(`Error getting user from cache: `, err);
        // Fall back to the regular getById which tries cache then server
        return this.getById(id);
      })
    );
  }

  private resolveUser(user: User | undefined, options?: { useCache: boolean }): Observable<User | undefined> {
    const EMPTY_CONGREGATION: Congregation = {
      id: '',
      name: '',
      locatedOn: '',
      cities: [],
      settings: environment.congregationSettingsDefaultValues,
    };

    if (!user) {
      return of(undefined);
    }

    if (!user?.congregation) {
      const userWithNoCongregation: User = { ...user, congregation: EMPTY_CONGREGATION };
      return of(userWithNoCongregation);
    }

    // Resolving FireBase Congregation Reference
    const congregationDocRef = this.congregationDatasourceService.createDocumentRef(user.congregation.id);
    const congregation$ = FirebaseCongregationDatasourceService.resolveUserCongregationReference(
      congregationDocRef,
      options
    );

    return congregation$.pipe(
      map((congregation) => {
        if (!congregation) {
          this.loggerService.error(`Could not find Congregation ID: ${user.congregation?.id} for User ID: ${user.id}`);
          // User with congregation deleted
          return { ...user, congregation: EMPTY_CONGREGATION };
        }

        // Overriding congregation reference with congregation data
        return { ...user, congregation: { ...congregation } };
      })
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
    const congregationDocRef = this.congregationDatasourceService.createDocumentRef(user.congregation.id);
    return forkJoin([
      user$,
      FirebaseCongregationDatasourceService.resolveUserCongregationReference(congregationDocRef),
    ]).pipe(
      map(([_, congregation]) => {
        return { ...user, congregation };
      })
    );
  }

  /** Basically a wrapper around {@link FirebaseUserDatasourceService#put} to map to a FirebaseModel */
  update(user: User): Observable<User> {
    if (!user.congregation?.id) {
      throw new Error('User with no congregation! Aborting update.');
    }

    const firebaseUser: FirebaseUserModel = {
      ...user,
      congregation: doc(
        this.firestore,
        `/${FirebaseCongregationDatasourceService.COLLECTION_NAME}/${user.congregation?.id}`
      ) as DocumentReference<Congregation, FirebaseCongregationModel>,
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
    const congregationDocRef = this.congregationDatasourceService.createDocumentRef(congregationId);
    const q = query(this.userCollection, where('congregation', '==', congregationDocRef));

    // This is a little nested. However, it's to avoid performing multiple calls to FireStore to resolve the congregation ref
    // Once the Users have been fetched, we resolve the congregationRef used as a query param only once and map to all users.
    return from(collectionData(q)).pipe(
      switchMap((users) => {
        return FirebaseCongregationDatasourceService.resolveUserCongregationReference(congregationDocRef).pipe(
          map((congregation) => {
            return users.map((u) => {
              if (!congregation) {
                this.loggerService.error(
                  `Could not find Congregation ID: ${congregationId} when fetching congregation People`
                );
              }

              u.congregation = congregation;
              return u;
            });
          })
        );
      })
    );
  }
}

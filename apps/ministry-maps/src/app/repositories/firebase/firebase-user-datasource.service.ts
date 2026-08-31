import { inject, Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromCache,
  getDocFromServer,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type { CollectionReference, DocumentReference } from 'firebase/firestore';

import { catchError, forkJoin, from, map, Observable, of, switchMap } from 'rxjs';

import { Congregation } from '../../../models/congregation';
import { RoleEnum } from '../../../models/enums/role';
import { FirebaseUserModel } from '../../../models/firebase/firebase-user-model';
import { User } from '../../../models/user';
import { UserRepository } from '../user.repository';
import { FirebaseCongregationModel } from '../../../models/firebase/firebase-congregation-model';
import { FirebaseCongregationDatasourceService } from './firebase-congregation-datasource.service';
import { FirebaseDatasource } from './firebase-datasource';
import { collectionData$, httpsCallableData$ } from './firebase-rxjs-interop';
import { FIRESTORE, FUNCTIONS } from './firebase-providers';
import { environment } from '../../../environments/environment';
import { LoggerService } from '../../shared/services/logger/logger.service';

@Injectable({
  providedIn: 'root',
})
export class FirebaseUserDatasourceService implements UserRepository, FirebaseDatasource<User> {
  static readonly COLLECTION_NAME = 'users';

  private readonly userCollection: CollectionReference<User, FirebaseUserModel>;
  private readonly deleteUserFn: (userId: string) => Observable<void>;
  private readonly provisionFromInviteFn: (data: { inviteId: string }) => Observable<unknown>;
  private readonly loggerService = inject(LoggerService);

  private readonly firestore = inject(FIRESTORE);
  private readonly functions = inject(FUNCTIONS);
  private readonly congregationDatasourceService = inject(FirebaseCongregationDatasourceService);

  constructor() {
    // USERS COLLECTION
    this.userCollection = collection(
      this.firestore,
      FirebaseUserDatasourceService.COLLECTION_NAME,
    ) as CollectionReference<User, FirebaseUserModel>;

    // FUNCTIONS
    this.deleteUserFn = httpsCallableData$<string, void>(this.functions, 'deleteUser');
    this.provisionFromInviteFn = httpsCallableData$<{ inviteId: string }, unknown>(this.functions, 'provisionUserFromInvite');
  }

  createDocumentRef(id: string): DocumentReference<User> {
    return doc(this.userCollection, id);
  }

  getById(id: string): Observable<User | undefined> {
    const userReference = doc(this.userCollection, id);

    return from(getDocFromServer(userReference)).pipe(
      map((userDocSnapshot) => userDocSnapshot.data()),
      switchMap((user) => this.resolveUser(user, { useCache: false })),
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
      }),
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
      options,
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
      }),
    );
  }

  /**
   * Creates the caller's profile via the `provisionUserFromInvite` Cloud Function — the only
   * path allowed to create `users` documents. Validates and consumes the invite atomically.
   */
  provisionFromInvite(inviteId: string, uid: string): Observable<User | undefined> {
    return this.provisionFromInviteFn({ inviteId }).pipe(switchMap(() => this.getById(uid)));
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
      congregation: doc(
        this.firestore,
        `/${FirebaseCongregationDatasourceService.COLLECTION_NAME}/${user.congregation?.id}`,
      ) as DocumentReference<Congregation, FirebaseCongregationModel>,
    };

    return this.put(firebaseUser);
  }

  delete(userId: string): Observable<void> {
    // The callable authorizes against the user doc, so it must run before the doc is deleted.
    // It is a cold observable — without a subscription it never executes at all.
    return this.deleteUserFn(userId).pipe(
      catchError((err) => {
        this.loggerService.error(`Error calling deleteUserFn Cloud Function for ${userId}`, err);
        return of(undefined);
      }),
      switchMap(() => from(deleteDoc(doc(this.userCollection, userId)))),
      map(() => undefined),
    );
  }

  getAllByCongregation(congregationId: string): Observable<User[]> {
    const congregationDocRef = this.congregationDatasourceService.createDocumentRef(congregationId);
    const q = query(this.userCollection, where('congregation', '==', congregationDocRef));

    // This is a little nested. However, it's to avoid performing multiple calls to FireStore to resolve the congregation ref
    // Once the Users have been fetched, we resolve the congregationRef used as a query param only once and map to all users.
    return collectionData$<User>(q).pipe(
      switchMap((users) => {
        return FirebaseCongregationDatasourceService.resolveUserCongregationReference(congregationDocRef).pipe(
          map((congregation) => {
            return users.map((u) => {
              if (!congregation) {
                this.loggerService.error(
                  `Could not find Congregation ID: ${congregationId} when fetching congregation People`,
                );
              }

              u.congregation = congregation;
              return u;
            });
          }),
        );
      }),
    );
  }
}

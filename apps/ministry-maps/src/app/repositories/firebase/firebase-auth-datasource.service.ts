import { Injectable } from '@angular/core';
import {
  Auth,
  authState,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
  UserCredential,
} from '@angular/fire/auth';
import { from, map, Observable, of, switchMap, take } from 'rxjs';

import { AuthErrorEnum, AuthRepository, CreateUserConfig } from '../auth.repository';
import { User } from '../../../models/user';
import { RoleEnum } from '../../../models/enums/role';
import { doc, DocumentReference, Firestore } from '@angular/fire/firestore';
import { Congregation } from '../../../models/congregation';
import { FirebaseUserDatasourceService } from './firebase-user-datasource.service';
import { FirebaseCongregationModel } from '../../../models/firebase/firebase-congregation-model';

export enum FIREBASE_PROVIDERS {
  'GOOGLE' = 'GOOGLE',
  'MICROSOFT' = 'MICROSOFT',
}

@Injectable({ providedIn: 'root' })
export class FirebaseAuthDatasourceService implements AuthRepository {
  constructor(
    private readonly auth: Auth,
    private readonly userRepository: FirebaseUserDatasourceService,
    private readonly firestore: Firestore
  ) {}

  /** Triggered by FireBase during Log-In and Log-Out events*/
  authStateChanged(): Observable<boolean> {
    return authState(this.auth)
      .pipe(map(firebaseUser => !!firebaseUser))
  }

  signInWithProvider(provider: FIREBASE_PROVIDERS, createUser = false, createUserConfig?: CreateUserConfig): Observable<User | void> {
    let authProviderInstance: GoogleAuthProvider | OAuthProvider;

    switch (provider) {
      case FIREBASE_PROVIDERS.GOOGLE:
        authProviderInstance = new GoogleAuthProvider();
        break;
      case FIREBASE_PROVIDERS.MICROSOFT:
        authProviderInstance = new OAuthProvider('microsoft.com');
        break;
      default:
        throw Error('Invalid Provider');
    }

    const providerRes = signInWithPopup(this.auth, authProviderInstance);

    return from(providerRes).pipe(switchMap(providerUser => this.handleUserAuthentication(providerUser, createUser, createUserConfig)));
  }

  /**
   * Specific for initializing a User from Firebase Authentication
   */
  getUserFromAuthentication() {
    return authState(this.auth).pipe(
      take(1),
      switchMap(providerUser => {
        if (providerUser) {
          return this.userRepository.getById(providerUser.uid);
        }

        return of(undefined);
      })
    );
  }

  logOut() {
    return from(signOut(this.auth));
  }

  /**
   * Uses the result from the {@link signInWithProvider} to fetch the user from DB or create a new if
   * {@link createUser} is true.
   *
   * <b>Note:</b> Why deleting the user? This is needed, because whenever the user authenticate with
   * {@link signInWithPopup}, Firebase creates a new user in the Authentication. So for users that were not
   * invited, and won't be able to log in, it makes sense clean it from the Firebase Authentication user base.
   *
   * @param providerUser The response from the AuthProvider that will be processed.
   * @param createUser When true, users that are not present in the database will be created (invite link use case).
   * If false, the user will be deleted.
   * @param createUserConfig When provided, will use the configuration found in here to set the user values.
   *
   * @returns the user from DB.
   */
  private handleUserAuthentication({ user: providerUser }: UserCredential, createUser = false, createUserConfig?: CreateUserConfig): Observable<User | void> {
    return this.userRepository.getById(providerUser.uid).pipe(
      take(1),
      switchMap(user => {
        if (user) {
          return of(user);
        }

        // This is a new user. If this is user is not supposed to be created, or it doesn't have the same email as
        // provided in the config, delete it.
        const isConfigEmailDifferent = (createUserConfig?.email && providerUser.email?.toLowerCase() !== createUserConfig.email.toLowerCase());

        if (!createUser || isConfigEmailDifferent) {
          return from(providerUser.delete()).pipe(
            map(_ => {
              if (isConfigEmailDifferent) {
                throw new Error(AuthErrorEnum.INVALID_EMAIL)
              }
            })
          );
        }

        if (!createUserConfig?.congregation) {
          throw new Error(AuthErrorEnum.INVALID_CREATE_USER_DATA)
        }

        return this.userRepository.put({
          id: providerUser.uid,
          email: providerUser.email ?? '',
          name: providerUser.displayName ?? 'Unidentified',
          photoUrl: providerUser.photoURL ?? '',
          role: createUserConfig?.role ?? RoleEnum.PUBLISHER,
          congregation: doc(this.firestore, `/congregations/${createUserConfig.congregation.id}`) as DocumentReference<Congregation, FirebaseCongregationModel>
        });
      }),
    );
  }
}

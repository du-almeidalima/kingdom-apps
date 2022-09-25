import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, OAuthProvider, signInWithPopup, UserCredential } from '@angular/fire/auth';
import { from, Observable, of, switchMap, take } from 'rxjs';

import { AuthRepository } from '../auth.repository';
import { User } from '../../../../../../models/user';
import { Role } from '../../../../../../models/enums/role';
import { UserRepository } from '../user.repository';

export enum FIREBASE_PROVIDERS {
  'GOOGLE' = 'GOOGLE',
  'MICROSOFT' = 'MICROSOFT',
}

@Injectable()
export class FirebaseAuthDatasourceService implements AuthRepository {
  constructor(private readonly auth: Auth, private readonly userRepository: UserRepository) {}

  private createUser(partialUser: Pick<User, 'id' | 'name' | 'email' | 'photoUrl'>): Observable<User> {
    const user: User = {
      ...partialUser,
      role: Role.PUBLISHER,
      congregationId: 'NONE',
    };

    return this.userRepository.put(user);
  }

  /**
   * Checks if it's the first time a User signs in and if so creates an entry in Users Collection for signed-up users.
   * @private
   */
  private handleUserAuthentication({ user: providerUser }: UserCredential): Observable<User> {
    return this.userRepository.getById(providerUser.uid).pipe(
      take(1),
      switchMap(user => {
        if (user) {
          return of(user);
        }

        return this.createUser({
          id: providerUser.uid,
          email: providerUser.email ?? '',
          name: providerUser.displayName ?? 'Unidentified',
          photoUrl: providerUser.photoURL ?? '',
        });
      })
    );
  }

  signInWithProvider(provider?: FIREBASE_PROVIDERS) {
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

    return from(providerRes).pipe(switchMap(providerUser => this.handleUserAuthentication(providerUser)));
  }
}

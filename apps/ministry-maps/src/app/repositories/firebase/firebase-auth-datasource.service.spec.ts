import { TestBed } from '@angular/core/testing';

import { FIREBASE_PROVIDERS, FirebaseAuthDatasourceService } from './firebase-auth-datasource.service';
import { MockProvider, ngMocks } from 'ng-mocks';
import { Auth } from '@angular/fire/auth';
import { FirebaseUserDatasourceService } from './firebase-user-datasource.service';
import { Firestore } from '@angular/fire/firestore';
import { catchError, EMPTY, finalize, of } from 'rxjs';
import { elderUser, userMockBuilder } from '../../../test/mocks';
import { RoleEnum } from '../../../models/enums/role';
import { AuthErrorEnum, CreateUserConfig } from '../auth.repository';

const MOCK_AUTH_RES = {
  user: {
    uid: '5kiekgXCB9TBWpREwLpFGTUwRnjR',
    email: 'dualmeidalima@gmail.com',
    emailVerified: true,
    displayName: 'Eduardo',
    isAnonymous: false,
    providerData: [
      {
        providerId: 'google.com',
        uid: '4385848341175678012596104818414271021518',
        displayName: 'Eduardo',
        email: 'dualmeidalima@gmail.com',
        phoneNumber: null,
        photoURL: null,
      },
    ],
    stsTokenManager: {
      refreshToken:
        'eyJfQXV0aEVtdWxhdG9yUmVmcmVzaFRva2VuIjoiRE8gTk9UIE1PRElGWSIsImxvY2FsSWQiOiI1a2lla2dYQ0I5VEJXcFJFd0xwRkdUVXdSbmpSIiwicHJvdmlkZXIiOiJnb29nbGUuY29tIiwiZXh0cmFDbGFpbXMiOnt9LCJwcm9qZWN0SWQiOiJkdS1taW5pc3RyeS1tYXBzIn0=',
      accessToken:
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJuYW1lIjoiRWR1YXJkbyIsImVtYWlsIjoiZHVhbG1laWRhbGltYUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXV0aF90aW1lIjoxNzA3ODM2MjAxLCJ1c2VyX2lkIjoiNWtpZWtnWENCOVRCV3BSRXdMcEZHVFV3Um5qUiIsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiZHVhbG1laWRhbGltYUBnbWFpbC5jb20iXSwiZ29vZ2xlLmNvbSI6WyI0Mzg1ODQ4MzQxMTc1Njc4MDEyNTk2MTA0ODE4NDE0MjcxMDIxNTE4Il19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9LCJpYXQiOjE3MDc4MzYyMDEsImV4cCI6MTcwNzgzOTgwMSwiYXVkIjoiZHUtbWluaXN0cnktbWFwcyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9kdS1taW5pc3RyeS1tYXBzIiwic3ViIjoiNWtpZWtnWENCOVRCV3BSRXdMcEZHVFV3Um5qUiJ9.',
      expirationTime: 1707839801414,
    },
    createdAt: '1693781034931',
    lastLoginAt: '1707836201410',
    apiKey: 'DEMO_API_KEY-12345',
    appName: '[DEFAULT]',
    delete: jest.fn().mockResolvedValue({}),
  },
  providerId: 'google.com',
  _tokenResponse: {
    kind: 'identitytoolkit#VerifyAssertionResponse',
    context: '',
    providerId: 'google.com',
    displayName: 'Eduardo',
    fullName: 'Eduardo',
    screenName: 'Eduardo',
    email: 'dualmeidalima@gmail.com',
    emailVerified: true,
    rawUserInfo:
      '{"granted_scopes":"openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email","id":"4385848341175678012596104818414271021518","name":"Eduardo","verified_email":true,"locale":"en","email":"dualmeidalima@gmail.com"}',
    federatedId: 'https://accounts.google.com/4385848341175678012596104818414271021518',
    oauthAccessToken: 'FirebaseAuthEmulatorFakeAccessToken_google.com',
    oauthIdToken:
      '{"sub":"4385848341175678012596104818414271021518","iss":"","aud":"","exp":0,"iat":0,"name":"Eduardo","screen_name":"Eduardo","email":"dualmeidalima@gmail.com","email_verified":true}',
    localId: '5kiekgXCB9TBWpREwLpFGTUwRnjR',
    idToken:
      'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJuYW1lIjoiRWR1YXJkbyIsImVtYWlsIjoiZHVhbG1laWRhbGltYUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXV0aF90aW1lIjoxNzA3ODM2MjAxLCJ1c2VyX2lkIjoiNWtpZWtnWENCOVRCV3BSRXdMcEZHVFV3Um5qUiIsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiZHVhbG1laWRhbGltYUBnbWFpbC5jb20iXSwiZ29vZ2xlLmNvbSI6WyI0Mzg1ODQ4MzQxMTc1Njc4MDEyNTk2MTA0ODE4NDE0MjcxMDIxNTE4Il19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9LCJpYXQiOjE3MDc4MzYyMDEsImV4cCI6MTcwNzgzOTgwMSwiYXVkIjoiZHUtbWluaXN0cnktbWFwcyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9kdS1taW5pc3RyeS1tYXBzIiwic3ViIjoiNWtpZWtnWENCOVRCV3BSRXdMcEZHVFV3Um5qUiJ9.',
    refreshToken:
      'eyJfQXV0aEVtdWxhdG9yUmVmcmVzaFRva2VuIjoiRE8gTk9UIE1PRElGWSIsImxvY2FsSWQiOiI1a2lla2dYQ0I5VEJXcFJFd0xwRkdUVXdSbmpSIiwicHJvdmlkZXIiOiJnb29nbGUuY29tIiwiZXh0cmFDbGFpbXMiOnt9LCJwcm9qZWN0SWQiOiJkdS1taW5pc3RyeS1tYXBzIn0=',
    expiresIn: '3600',
  },
  operationType: 'signIn',
};

const MOCK_USER = userMockBuilder({
  email: MOCK_AUTH_RES.user.email,
  id: MOCK_AUTH_RES.user.uid,
  name: MOCK_AUTH_RES.user.displayName,
  photoUrl: '',
});

const mockSignInWithPopup = jest.fn().mockReturnValue(Promise.resolve(MOCK_AUTH_RES));

jest.mock('@angular/fire/auth', () => {
  const originalModule = jest.requireActual('@angular/fire/auth');

  return {
    __esModule: true,
    ...originalModule,
    signInWithPopup: () => mockSignInWithPopup(),
  };
});

jest.mock('@angular/fire/firestore', () => {
  const originalModule = jest.requireActual('@angular/fire/firestore');
  return {
    __esModule: true,
    ...originalModule,
    doc: jest.fn().mockImplementation((_, path) => {
      return {
        path,
      };
    }),
  };
});

describe('FirebaseAuthService', () => {
  let service: FirebaseAuthDatasourceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MockProvider(Auth),
        MockProvider(FirebaseUserDatasourceService, {
          getById: () => of(MOCK_USER),
        }),
        MockProvider(Firestore),
      ],
    });

    service = TestBed.inject(FirebaseAuthDatasourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should authenticate user', (done) => {
    service.signInWithProvider(FIREBASE_PROVIDERS.GOOGLE).subscribe((userRes) => {
      expect(userRes).toEqual(expect.objectContaining(MOCK_USER));
      done();
    });
  });

  it(`should create user if doesn't exists`, (done) => {
    const userRepository = ngMocks.get(FirebaseUserDatasourceService);
    userRepository.getById = jest.fn().mockReturnValue(of(undefined));
    userRepository.put = jest.fn().mockImplementation((user) => of(user));

    // From InvitationLink
    const createUserConfig: CreateUserConfig = {
      role: RoleEnum.PUBLISHER,
      congregation: elderUser.congregation!,
    };

    service.signInWithProvider(FIREBASE_PROVIDERS.GOOGLE, true, createUserConfig).subscribe((userRes) => {
      const expectUser = {
        id: MOCK_USER.id,
        name: MOCK_USER.name,
        email: MOCK_USER.email,
        photoUrl: MOCK_USER.photoUrl,
        role: RoleEnum.PUBLISHER,
        congregation: expect.objectContaining({ path: `/congregations/${createUserConfig.congregation.id}` }),
      };

      expect(userRepository.getById).toHaveBeenCalledWith(MOCK_USER.id);
      expect(userRepository.put).toHaveBeenCalledWith(expect.objectContaining(expectUser));
      expect(userRes).toEqual(expect.objectContaining(expectUser));

      done();
    });
  });

  it(`should delete user after log in that doesn't exist in the database when not in sign-in`, (done) => {
    const userRepository = ngMocks.get(FirebaseUserDatasourceService);
    userRepository.getById = jest.fn().mockReturnValue(of(undefined));

    service.signInWithProvider(FIREBASE_PROVIDERS.GOOGLE, false).subscribe((_) => {
      expect(userRepository.getById).toHaveBeenCalledWith(MOCK_USER.id);
      expect(MOCK_AUTH_RES.user.delete).toHaveBeenCalled();
      expect(userRepository.put).not.toHaveBeenCalled();

      done();
    });
  });

  it(`should delete user after log in from invite link that doesn't match the email provided`, (done) => {
    const userRepository = ngMocks.get(FirebaseUserDatasourceService);
    userRepository.getById = jest.fn().mockReturnValue(of(undefined));

    // From InvitationLink
    const createUserConfig: CreateUserConfig = {
      role: RoleEnum.PUBLISHER,
      congregation: elderUser.congregation!,
      email: 'different.email@test.com',
    };

    service
      .signInWithProvider(FIREBASE_PROVIDERS.GOOGLE, true, createUserConfig)
      .pipe(
        catchError((error) => {
          // Verify the error is what we expect
          expect(error.message).toBe(AuthErrorEnum.INVALID_EMAIL);
          // Make assertions that should happen before the error
          expect(userRepository.getById).toHaveBeenCalledWith(MOCK_USER.id);
          expect(MOCK_AUTH_RES.user.delete).toHaveBeenCalled();
          expect(userRepository.put).not.toHaveBeenCalled();

          return EMPTY;
        }),
        finalize(() => {
          done();
        })
      )
      .subscribe(() => {
        // This should not be called if an error is thrown
        fail('Expected an error but got a successful result');
      });
  });
});

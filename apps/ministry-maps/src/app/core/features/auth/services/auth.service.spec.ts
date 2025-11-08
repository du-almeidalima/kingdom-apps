import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { MockProvider, ngMocks } from 'ng-mocks';
import { AuthRepository } from '../../../../repositories/auth.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { FIREBASE_PROVIDERS, FirebaseAuthDatasourceService } from '../../../../repositories/firebase/firebase-auth-datasource.service';
import { of } from 'rxjs';
import { userMockBuilder } from '../../../../../test/mocks';
import { RoleEnum } from '../../../../../models/enums/role';
import { AuthUserStateService } from '@kingdom-apps/common-ui';
import { Router } from '@angular/router';
import { FirebaseUserDatasourceService } from '../../../../repositories/firebase/firebase-user-datasource.service';

describe('AuthService', () => {
  let service: AuthService;
  const ADMIN_USER_MOCK = userMockBuilder({ role: RoleEnum.ADMIN });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserStateService,
        MockProvider(AuthRepository, {
          signInWithProvider: jest.fn().mockReturnValue(of(ADMIN_USER_MOCK)),
          authStateChanged: jest.fn().mockReturnValue(of(true))
        }),
        MockProvider(AuthUserStateService, {
          setUser: jest.fn()
        }),
        MockProvider(FirebaseAuthDatasourceService, {
          getUserFromAuthentication: jest.fn().mockReturnValue(of(ADMIN_USER_MOCK))
        }),
        MockProvider(FirebaseUserDatasourceService, {
          getById: jest.fn().mockReturnValue(of(ADMIN_USER_MOCK))
        }),
        MockProvider(Router, {
          navigate: jest.fn()
        }),
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save user state', done => {
    const userStateService = ngMocks.get(UserStateService);
    const authUserStateService = ngMocks.get(AuthUserStateService);
    const authRepository = ngMocks.get(AuthRepository);

    service.signInWithProvider(FIREBASE_PROVIDERS.GOOGLE).subscribe(() => {
      expect(authRepository.signInWithProvider).toHaveBeenCalled();
      expect(userStateService.currentUser).toEqual(ADMIN_USER_MOCK);
      expect(authUserStateService.setUser).toHaveBeenCalledWith({
        roles: [ADMIN_USER_MOCK.role],
        name: ADMIN_USER_MOCK.name,
      });

      done();
    });
  });
});

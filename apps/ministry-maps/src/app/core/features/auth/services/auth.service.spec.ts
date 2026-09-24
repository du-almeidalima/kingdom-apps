import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { MockProvider, ngMocks } from 'ng-mocks';
import { AuthRepository } from '../../../../repositories/auth.repository';
import { UserStateService } from '../../../../state/user.state.service';
import {
  FIREBASE_PROVIDERS,
  FirebaseAuthDatasourceService,
} from '../../../../repositories/firebase/firebase-auth-datasource.service';
import { of } from 'rxjs';
import { userMockBuilder } from '../../../../../test/mocks';
import { RoleEnum } from '../../../../../models/enums/role';
import { AuthUserStateService } from '@kingdom-apps/common-ui';
import { Router } from '@angular/router';
import { FirebaseUserDatasourceService } from '../../../../repositories/firebase/firebase-user-datasource.service';
import { AssignTerritoriesStateService } from '../../../../features/territory/state/assign-territories.state.service';
import { AuthRoutesEnum } from '../models/enums/auth-routes';

describe('AuthService', () => {
  let service: AuthService;
  const ADMIN_USER_MOCK = userMockBuilder({ role: RoleEnum.ADMIN });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserStateService,
        MockProvider(AuthRepository, {
          signInWithProvider: jest.fn().mockReturnValue(of(ADMIN_USER_MOCK)),
          authStateChanged: jest.fn().mockReturnValue(of(true)),
          logOut: jest.fn(),
        }),
        MockProvider(AuthUserStateService, {
          setUser: jest.fn(),
        }),
        MockProvider(FirebaseAuthDatasourceService, {
          getUserFromAuthentication: jest.fn().mockReturnValue(of(ADMIN_USER_MOCK)),
        }),
        MockProvider(FirebaseUserDatasourceService, {
          getById: jest.fn().mockReturnValue(of(ADMIN_USER_MOCK)),
        }),
        MockProvider(AssignTerritoriesStateService, {
          reset: jest.fn(),
        }),
        MockProvider(Router, {
          navigate: jest.fn(),
        }),
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save user state', (done) => {
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

  describe('logOut', () => {
    it('should reset assign territories state and call repository logOut', () => {
      const assignTerritoriesState = ngMocks.get(AssignTerritoriesStateService);
      const authRepository = ngMocks.get(AuthRepository);

      service.logOut();

      expect(assignTerritoriesState.reset).toHaveBeenCalledTimes(1);
      expect(authRepository.logOut).toHaveBeenCalledTimes(1);
    });

    it('should reset assign territories state, clear user and navigate on authStateChanged(false)', () => {
      const userStateService = ngMocks.get(UserStateService);

      // Simulate an active logged-in user
      userStateService.setUser(ADMIN_USER_MOCK);

      // Re-initialize service with authStateChanged emitting false
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          UserStateService,
          MockProvider(AuthRepository, {
            authStateChanged: jest.fn().mockReturnValue(of(false)),
          }),
          MockProvider(AuthUserStateService, {
            setUser: jest.fn(),
          }),
          MockProvider(FirebaseAuthDatasourceService, {}),
          MockProvider(FirebaseUserDatasourceService, {}),
          MockProvider(AssignTerritoriesStateService, {
            reset: jest.fn(),
          }),
          MockProvider(Router, {
            navigate: jest.fn(),
          }),
        ],
      });

      const resetUserState = TestBed.inject(UserStateService);
      resetUserState.setUser(ADMIN_USER_MOCK);
      const resetAssignState = ngMocks.get(AssignTerritoriesStateService);
      const resetAuthUserState = ngMocks.get(AuthUserStateService);
      const resetRouter = ngMocks.get(Router);

      TestBed.inject(AuthService);

      expect(resetUserState.currentUser).toBeNull();
      expect(resetAuthUserState.setUser).toHaveBeenCalledWith(null);
      expect(resetAssignState.reset).toHaveBeenCalledTimes(1);
      expect(resetRouter.navigate).toHaveBeenCalledWith([AuthRoutesEnum.LOGIN]);
    });
  });
});

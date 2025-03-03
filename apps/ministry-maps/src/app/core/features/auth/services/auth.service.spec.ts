import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { MockProvider, ngMocks } from 'ng-mocks';
import { AuthRepository } from '../../../../repositories/auth.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { FIREBASE_PROVIDERS } from '../../../../repositories/firebase/firebase-auth-datasource.service';
import { of } from 'rxjs';
import { userMockBuilder } from '../../../../../test/mocks';
import { RoleEnum } from '../../../../../models/enums/role';

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
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save user state', done => {
    const userStateService = ngMocks.get(UserStateService);
    const test = ngMocks.get(AuthRepository);

    service.signInWithProvider(FIREBASE_PROVIDERS.GOOGLE).subscribe(() => {
      expect(test.signInWithProvider).toHaveBeenCalled();
      expect(userStateService.currentUser).toEqual(ADMIN_USER_MOCK);

      done();
    });
  });
});

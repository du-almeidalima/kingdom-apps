import { TestBed } from '@angular/core/testing';

import { AuthUserStateService } from './auth-user.state.service';

describe('AuthUserService', () => {
  let service: AuthUserStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthUserStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

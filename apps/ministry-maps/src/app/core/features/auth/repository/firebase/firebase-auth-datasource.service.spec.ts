import { TestBed } from '@angular/core/testing';

import { FirebaseAuthDatasourceService } from './firebase-auth-datasource.service';

describe('FirebaseAuthService', () => {
  let service: FirebaseAuthDatasourceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseAuthDatasourceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { FirebaseUserDatasourceService } from './firebase-user-datasource.service';

describe('FirebaseUserDatasourceService', () => {
  let service: FirebaseUserDatasourceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseUserDatasourceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

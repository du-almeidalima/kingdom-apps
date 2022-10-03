import { TestBed } from '@angular/core/testing';

import { FirebaseTerritoryDatasourceService } from './firebase-territory-datasource.service';

describe('FirebaseTerritoryDatasourceService', () => {
  let service: FirebaseTerritoryDatasourceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseTerritoryDatasourceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

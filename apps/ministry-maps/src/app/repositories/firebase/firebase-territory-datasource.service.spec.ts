import { TestBed } from '@angular/core/testing';

import { FirebaseTerritoryDatasourceService } from './firebase-territory-datasource.service';

//TODO: Write tests using Firebase Emulator
xdescribe('FirebaseTerritoryDatasourceService', () => {
  let service: FirebaseTerritoryDatasourceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseTerritoryDatasourceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

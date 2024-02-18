import { TestBed } from '@angular/core/testing';
import { FirebaseCongregationDatasourceService } from './firebase-congregation-datasource.service';

//TODO: Write tests using Firebase Emulator
xdescribe('FirebaseCongregationDatasourceService', () => {
  let service: FirebaseCongregationDatasourceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseCongregationDatasourceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

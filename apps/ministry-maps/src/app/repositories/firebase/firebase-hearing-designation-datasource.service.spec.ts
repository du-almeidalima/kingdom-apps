import { TestBed } from '@angular/core/testing';
import { FirebaseHearingDesignationDatasourceService } from './firebase-hearing-designation-datasource.service';

//TODO: Write tests using Firebase Emulator
xdescribe('FirebaseHearingDesignationDatasourceService', () => {
  let service: FirebaseHearingDesignationDatasourceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseHearingDesignationDatasourceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

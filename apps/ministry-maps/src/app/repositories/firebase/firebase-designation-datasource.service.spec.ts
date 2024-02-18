import { TestBed } from '@angular/core/testing';
import { FirebaseDesignationDatasourceService } from './firebase-designation-datasource.service';

//TODO: Write tests using Firebase Emulator
xdescribe('FirebaseDesignationDatasourceService', () => {
  let service: FirebaseDesignationDatasourceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseDesignationDatasourceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

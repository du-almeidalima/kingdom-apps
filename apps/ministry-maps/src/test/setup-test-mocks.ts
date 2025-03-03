import { MockService, ngMocks } from 'ng-mocks';
import { UserStateService } from '../app/state/user.state.service';
import { CongregationRepositoryMock, organizerUserStateServiceMock, UserRepositoryMock } from './mocks';
import { CongregationRepository } from '../app/repositories/congregation.repository';
import { DefaultTitleStrategy, TitleStrategy } from '@angular/router';
import { NgModule } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import { connectFirestoreEmulator, getFirestore, provideFirestore } from '@angular/fire/firestore';
import { TerritoryRepository } from '../app/repositories/territories.repository';
import { TerritoryRepositoryMock } from './mocks/models/territory.mock';
import { AuthRepository } from '../app/repositories/auth.repository';
import { AuthRepositoryMock } from './mocks/models/auth.mock';
import { DesignationRepository } from '../app/repositories/designation.repository';
import { DesignationRepositoryMock } from './mocks/models/designation.mock';
import { UserRepository } from '../app/repositories/user.repository';

ngMocks.defaultMock(TitleStrategy, () => MockService(DefaultTitleStrategy));
ngMocks.defaultMock(UserStateService, () => organizerUserStateServiceMock);
ngMocks.defaultMock(UserRepository, () => new UserRepositoryMock());
ngMocks.defaultMock(CongregationRepository, () => new CongregationRepositoryMock());
ngMocks.defaultMock(TerritoryRepository, () => new TerritoryRepositoryMock());
ngMocks.defaultMock(AuthRepository, () => new AuthRepositoryMock());
ngMocks.defaultMock(DesignationRepository, () => new DesignationRepositoryMock());
// ngMocks.defaultMock(NoteRepository, () => new NoteRepositoryMock());

// Firebase Setup (Not in use at the moment)
@NgModule({
  providers: [
    provideFirebaseApp(() =>
      initializeApp({
        projectId: 'du-ministry-maps',
        appId: '123456789',
        apiKey: 'DEMO_API_KEY-12345',
        authDomain: 'localhost:9099',
      })
    ),
    provideAuth(() => {
      const auth = getAuth();
      connectAuthEmulator(auth, 'http://localhost:9099');

      return auth;
    }),
    provideFirestore(() => {
      const firestore = getFirestore();
      connectFirestoreEmulator(firestore, 'localhost', 8080);
      return firestore;
    }),
  ],
})
export class FirebaseTestModule {}

jest.mock('@angular/fire/firestore', () => {
  const originalModule = jest.requireActual('@angular/fire/firestore');

  return {
    __esModule: true,
    ...originalModule,
    doc: jest.fn().mockImplementation((firestore, path) => ({ path })),
  };
});

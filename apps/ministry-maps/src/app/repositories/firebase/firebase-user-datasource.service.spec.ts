import { TestBed } from '@angular/core/testing';
import { deleteDoc, getDoc, getDocFromCache, getDocFromServer, setDoc } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { lastValueFrom, of } from 'rxjs';
import { MockProvider } from 'ng-mocks';

import { FirebaseUserDatasourceService } from './firebase-user-datasource.service';
import { FirebaseCongregationDatasourceService } from './firebase-congregation-datasource.service';
import { collectionData$ } from './firebase-rxjs-interop';
import { FIRESTORE, FUNCTIONS } from './firebase-providers';
import { LoggerService } from '../../shared/services/logger/logger.service';
import type { Congregation } from '../../../models/congregation';
import { userMockBuilder } from '../../../test/mocks';

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(() => ({})),
  deleteDoc: jest.fn(),
  doc: jest.fn((_parent: unknown, id: string) => ({ id })),
  getDoc: jest.fn(),
  getDocFromCache: jest.fn(),
  getDocFromServer: jest.fn(),
  query: jest.fn(() => ({})),
  setDoc: jest.fn(() => Promise.resolve()),
  where: jest.fn(),
}));

jest.mock('firebase/functions', () => ({
  ...jest.requireActual('firebase/functions'),
  httpsCallable: jest.fn(),
}));

jest.mock('./firebase-rxjs-interop', () => ({
  ...jest.requireActual('./firebase-rxjs-interop'),
  collectionData$: jest.fn(),
}));

const userWithCongregation = userMockBuilder({ id: 'u-1', congregation: { id: 'c-1' } as Congregation });
const congregation = { id: 'c-1', name: 'Congregation 1' } as Congregation;

describe('FirebaseUserDatasourceService', () => {
  let service: FirebaseUserDatasourceService;
  let deleteUserCallable: jest.Mock;
  let provisionCallable: jest.Mock;

  beforeEach(() => {
    deleteUserCallable = jest.fn(() => Promise.resolve({ data: undefined }));
    provisionCallable = jest.fn(() => Promise.resolve({ data: undefined }));
    // The datasources capture the callable at construction time — wire the mock first.
    (httpsCallable as jest.Mock).mockImplementation((_functions: unknown, name: string) =>
      name === 'deleteUser' ? deleteUserCallable : provisionCallable,
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: FIRESTORE, useValue: {} },
        { provide: FUNCTIONS, useValue: {} },
        MockProvider(LoggerService),
        MockProvider(FirebaseCongregationDatasourceService, {
          createDocumentRef: (id: string) => ({ id }) as DocumentReference<Congregation, never>,
        }),
      ],
    });

    service = TestBed.inject(FirebaseUserDatasourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('delete', () => {
    it('executes the deleteUser callable only on subscribe, then deletes the user document', async () => {
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      const deletion$ = service.delete('u-1');

      // Cold observable: the callable must not have fired yet.
      expect(deleteUserCallable).not.toHaveBeenCalled();
      expect(deleteDoc).not.toHaveBeenCalled();

      await lastValueFrom(deletion$);

      expect(deleteUserCallable).toHaveBeenCalledWith('u-1');
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('still deletes the document when the callable fails (error is swallowed and logged)', async () => {
      deleteUserCallable.mockRejectedValue(new Error('callable failed'));
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);
      const logger = TestBed.inject(LoggerService);

      await lastValueFrom(service.delete('u-1'));

      expect(logger.error).toHaveBeenCalled();
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('reads the user from the server and resolves the congregation via the server resolver', async () => {
      (getDocFromServer as jest.Mock).mockResolvedValue({ exists: () => true, data: () => userWithCongregation });
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => congregation });

      const user = await lastValueFrom(service.getById('u-1'));

      expect(getDocFromServer).toHaveBeenCalledWith(expect.objectContaining({ id: 'u-1' }));
      expect(user?.congregation).toEqual(expect.objectContaining({ id: 'c-1' }));
    });
  });

  describe('getByIdFromCache', () => {
    it('reads the user from the cache and resolves its congregation reference', async () => {
      (getDocFromCache as jest.Mock).mockImplementation((ref: { id: string }) =>
        ref.id === 'u-1' ? Promise.resolve({ exists: () => true, data: () => userWithCongregation }) : Promise.resolve({ exists: () => true, data: () => congregation }),
      );

      const user = await lastValueFrom(service.getByIdFromCache('u-1'));

      expect(getDocFromCache).toHaveBeenCalledWith(expect.objectContaining({ id: 'u-1' }));
      expect(getDocFromServer).not.toHaveBeenCalled();
      expect(user?.congregation).toEqual(expect.objectContaining({ id: 'c-1', name: 'Congregation 1' }));
    });

    it('falls back to the server read when the cache read fails', async () => {
      (getDocFromCache as jest.Mock).mockRejectedValue(new Error('unavailable'));
      (getDocFromServer as jest.Mock).mockResolvedValue({ exists: () => true, data: () => userWithCongregation });
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => congregation });

      const user = await lastValueFrom(service.getByIdFromCache('u-1'));

      expect(getDocFromServer).toHaveBeenCalled();
      expect(user?.congregation).toEqual(expect.objectContaining({ id: 'c-1' }));
    });
  });

  describe('getAllByCongregation', () => {
    it('streams the users of the congregation with the shared congregation resolved once', async () => {
      (collectionData$ as jest.Mock).mockReturnValue(of([userWithCongregation]));
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => congregation });

      const users = await lastValueFrom(service.getAllByCongregation('c-1'));

      expect(users.map((u) => u.id)).toEqual(['u-1']);
      expect(users[0].congregation).toEqual(expect.objectContaining({ name: 'Congregation 1' }));
      // The congregation reference used as query param is resolved exactly once for all users.
      expect(getDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('provisionFromInvite', () => {
    it('invokes the provisionUserFromInvite callable and then reads the created profile', async () => {
      (getDocFromServer as jest.Mock).mockResolvedValue({ exists: () => true, data: () => userWithCongregation });
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => congregation });

      await lastValueFrom(service.provisionFromInvite('invite-1', 'u-1'));

      expect(provisionCallable).toHaveBeenCalledWith({ inviteId: 'invite-1' });
      expect(getDocFromServer).toHaveBeenCalledWith(expect.objectContaining({ id: 'u-1' }));
    });
  });

  describe('update', () => {
    it('writes the congregation as a document reference', async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => congregation });

      await lastValueFrom(service.update(userMockBuilder({ congregation: { ...congregation } as Congregation })));

      const payload = (setDoc as jest.Mock).mock.calls[0][1];
      expect(payload.congregation).toEqual({ id: '/congregations/c-1' });
    });
  });
});

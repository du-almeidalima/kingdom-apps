import { TestBed } from '@angular/core/testing';
import { collection, doc, docData, Firestore, setDoc, Timestamp } from '@angular/fire/firestore';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';

import { FirebaseDesignationDatasourceService } from './firebase-designation-datasource.service';
import { Designation } from '../../../models/designation';

jest.mock('@angular/fire/firestore', () => ({
  ...jest.requireActual('@angular/fire/firestore'),
  collection: jest.fn(),
  doc: jest.fn(),
  docData: jest.fn(),
  setDoc: jest.fn(),
}));

describe('FirebaseDesignationDatasourceService', () => {
  let service: FirebaseDesignationDatasourceService;

  const designation: Designation = {
    id: '',
    congregationId: 'congregation-1',
    territories: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: 'user-1',
    expiresAt: new Date('2026-01-08T00:00:00.000Z'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockProvider(Firestore)],
    });

    (collection as jest.Mock).mockReturnValue({ withConverter: jest.fn().mockReturnThis() });
    (doc as jest.Mock).mockReturnValue({ id: 'designation-1' });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (docData as jest.Mock).mockReturnValue(of(designation));

    service = TestBed.inject(FirebaseDesignationDatasourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('add', () => {
    it('should persist the generated document id', () => {
      service.add(designation).subscribe();

      const payload = (setDoc as jest.Mock).mock.calls[0][1];
      expect(payload.id).toBe('designation-1');
    });

    it('should set expireAt 6 months (180 days) after creation for the TTL policy', () => {
      const before = Date.now();

      service.add(designation).subscribe();

      const after = Date.now();
      const payload = (setDoc as jest.Mock).mock.calls[0][1];
      const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;

      expect(payload.expireAt).toBeInstanceOf(Timestamp);
      expect(payload.expireAt.toMillis()).toBeGreaterThanOrEqual(before + sixMonthsMs);
      expect(payload.expireAt.toMillis()).toBeLessThanOrEqual(after + sixMonthsMs);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { collection, doc, getDocs, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { lastValueFrom, of } from 'rxjs';

import { FirebaseDesignationsHeaderDatasourceService } from './firebase-designations-header-datasource.service';
import { FIRESTORE } from './firebase-providers';
import { docData$ } from './firebase-rxjs-interop';
import { DesignationsHeader } from '../../../models/designations-header';
import { DesignationsHeaderStatusEnum } from '../../../models/enums/designations-header-status';
import { DesignationsHeaderClosedByEnum } from '../../../models/enums/designations-header-closed-by';

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('./firebase-rxjs-interop', () => ({
  ...jest.requireActual('./firebase-rxjs-interop'),
  collectionData$: jest.fn(),
  docData$: jest.fn(),
}));

describe('FirebaseDesignationsHeaderDatasourceService', () => {
  let service: FirebaseDesignationsHeaderDatasourceService;

  const sampleHeader: DesignationsHeader = {
    id: 'header-1',
    congregationId: 'congregation-1',
    status: DesignationsHeaderStatusEnum.IN_PROGRESS,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: 'user-1',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: FIRESTORE, useValue: {} }],
    });

    (collection as jest.Mock).mockReturnValue({ withConverter: jest.fn().mockReturnThis() });
    (doc as jest.Mock).mockImplementation((_coll, id) => ({ id: id ?? 'header-1' }));
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (docData$ as jest.Mock).mockReturnValue(of(sampleHeader));
    (getDocs as jest.Mock).mockResolvedValue({ empty: true, docs: [] });

    service = TestBed.inject(FirebaseDesignationsHeaderDatasourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('add', () => {
    it('should persist the generated document id and set 180-day TTL expireAt', async () => {
      const before = Date.now();
      const result = await lastValueFrom(
        service.add({
          congregationId: 'congregation-1',
          status: DesignationsHeaderStatusEnum.IN_PROGRESS,
          createdAt: new Date(),
          createdBy: 'user-1',
        }),
      );

      const after = Date.now();
      const payload = (setDoc as jest.Mock).mock.calls[0][1];
      const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;

      expect(payload.id).toBe('header-1');
      expect(payload.expireAt).toBeInstanceOf(Timestamp);
      expect(payload.expireAt.toMillis()).toBeGreaterThanOrEqual(before + sixMonthsMs);
      expect(payload.expireAt.toMillis()).toBeLessThanOrEqual(after + sixMonthsMs);
      expect(result).toBe(sampleHeader);
    });
  });

  describe('close', () => {
    it('should update status to DONE with closedAt and closedBy', async () => {
      await lastValueFrom(service.close('header-1', DesignationsHeaderClosedByEnum.USER));

      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'header-1' }),
        expect.objectContaining({
          status: DesignationsHeaderStatusEnum.DONE,
          closedBy: DesignationsHeaderClosedByEnum.USER,
          closedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('getInProgressByCongregation', () => {
    it('should return undefined when no header is open', async () => {
      (getDocs as jest.Mock).mockResolvedValue({ empty: true, docs: [] });

      const result = await lastValueFrom(service.getInProgressByCongregation('congregation-1'));

      expect(result).toBeUndefined();
    });

    it('should return the active header when one exists', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ data: () => sampleHeader }],
      });

      const result = await lastValueFrom(service.getInProgressByCongregation('congregation-1'));

      expect(result).toBe(sampleHeader);
    });
  });
});

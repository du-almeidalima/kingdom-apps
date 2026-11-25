import { TestBed } from '@angular/core/testing';
import { deleteField, doc, FieldPath, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { lastValueFrom, of } from 'rxjs';

import { DesignationsHeader } from '../../../models/designations-header';
import { DesignationsHeaderStatusEnum } from '../../../models/enums/designations-header-status';
import { DESIGNATIONS_PROGRESS_DOC_ID, TerritoryProgressEntry } from '../../../models/designations-progress';
import { FirebaseDesignationsProgressDatasourceService } from './firebase-designations-progress-datasource.service';
import { FIRESTORE } from './firebase-providers';
import { docData$ } from './firebase-rxjs-interop';

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  deleteField: jest.fn(), doc: jest.fn(), setDoc: jest.fn(), updateDoc: jest.fn(),
}));
jest.mock('./firebase-rxjs-interop', () => ({ ...jest.requireActual('./firebase-rxjs-interop'), docData$: jest.fn() }));

describe('FirebaseDesignationsProgressDatasourceService', () => {
  let service: FirebaseDesignationsProgressDatasourceService;
  const reference = { withConverter: jest.fn().mockReturnThis() };
  const header: DesignationsHeader = {
    id: 'H1', congregationId: 'C1', status: DesignationsHeaderStatusEnum.IN_PROGRESS,
    createdAt: new Date('2026-01-01T00:00:00Z'), createdBy: 'U1',
  };
  const entry: TerritoryProgressEntry = {
    designationId: 'D1', territoryId: 'T1', outcome: 0, completedAt: new Date('2026-01-02T00:00:00Z'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: FIRESTORE, useValue: {} }] });
    (doc as jest.Mock).mockReturnValue(reference);
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (deleteField as jest.Mock).mockReturnValue('DELETE_FIELD');
    (docData$ as jest.Mock).mockReturnValue(of(undefined));
    service = TestBed.inject(FirebaseDesignationsProgressDatasourceService);
  });

  afterEach(() => jest.clearAllMocks());

  it('merge-registers a designation without sending territories and uses header TTL when present', async () => {
    const expires = new Date('2027-01-01T00:00:00Z');
    await lastValueFrom(service.registerDesignation({ ...header, expireAt: expires }, 'D1', {
      territoriesTotal: 3, createdAt: header.createdAt, expiresAt: expires,
    }));
    const payload = (setDoc as jest.Mock).mock.calls[0][1];
    expect((setDoc as jest.Mock).mock.calls[0][2]).toEqual({ merge: true });
    expect(payload).toMatchObject({ id: DESIGNATIONS_PROGRESS_DOC_ID, headerId: 'H1', congregationId: 'C1', expireAt: expires, designations: { D1: { territoriesTotal: 3 } } });
    expect(payload).not.toHaveProperty('territories');
  });

  it('falls back to createdAt plus 180 days for progress TTL', async () => {
    await lastValueFrom(service.registerDesignation(header, 'D1', { territoriesTotal: 0, createdAt: header.createdAt, expiresAt: header.createdAt }));
    expect((setDoc as jest.Mock).mock.calls[0][1].expireAt).toEqual(new Date(header.createdAt.getTime() + 180 * 24 * 60 * 60 * 1000));
  });

  it('sets a territory entry by a FieldPath and defers writes until subscribed', async () => {
    const write$ = service.setTerritoryProgress('H1', entry);
    expect(updateDoc).not.toHaveBeenCalled();
    await lastValueFrom(write$);
    const [, path, value] = (updateDoc as jest.Mock).mock.calls[0];
    expect(path.isEqual(new FieldPath('territories', 'D1_T1'))).toBe(true);
    expect(value).toEqual(entry);
    expect(doc).toHaveBeenCalledWith({}, 'designations_header', 'H1', 'progress', DESIGNATIONS_PROGRESS_DOC_ID);
    expect(reference.withConverter).not.toHaveBeenCalled();
  });

  it('removes one territory entry using the deleteField sentinel', async () => {
    await lastValueFrom(service.removeTerritoryProgress('H1', 'D1', 'T1'));
    expect(deleteField).toHaveBeenCalled();
    expect((updateDoc as jest.Mock).mock.calls[0][2]).toBe('DELETE_FIELD');
  });

  it('converts timestamps and defaults missing maps to empty objects', () => {
    service.getStreamByHeaderId('H1').subscribe();
    const converter = reference.withConverter.mock.calls[0][0];
    const createdAt = Timestamp.fromDate(header.createdAt);
    const completedAt = Timestamp.fromDate(entry.completedAt);
    const converted = converter.fromFirestore({ id: 'summary', data: () => ({
      headerId: 'H1', congregationId: 'C1', expireAt: createdAt,
      designations: { D1: { territoriesTotal: 1, createdAt, expiresAt: completedAt } },
      territories: { D1_T1: { ...entry, completedAt } },
    }) });
    expect(converted.expireAt).toEqual(header.createdAt);
    expect(converted.designations.D1.createdAt).toEqual(header.createdAt);
    expect(converted.territories.D1_T1.completedAt).toEqual(entry.completedAt);
    const missing = converter.fromFirestore({ id: 'summary', data: () => ({ headerId: 'H1', congregationId: 'C1' }) });
    expect(missing.designations).toEqual({});
    expect(missing.territories).toEqual({});
  });
});

import { TestBed } from '@angular/core/testing';
import { collection, doc, setDoc } from 'firebase/firestore';
import { lastValueFrom } from 'rxjs';

import { FirebaseCongregationDatasourceService } from './firebase-congregation-datasource.service';
import { FIRESTORE } from './firebase-providers';
import { Congregation } from '../../../models/congregation';

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
}));

describe('FirebaseCongregationDatasourceService', () => {
  let service: FirebaseCongregationDatasourceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: FIRESTORE, useValue: {} }],
    });

    (collection as jest.Mock).mockReturnValue({ withConverter: jest.fn().mockReturnThis() });
    (doc as jest.Mock).mockImplementation((_coll, id) => ({ id: id ?? 'generated-cong-id' }));
    (setDoc as jest.Mock).mockResolvedValue(undefined);

    service = TestBed.inject(FirebaseCongregationDatasourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds a congregation with a generated document id and returns the created Congregation', async () => {
    const input: Omit<Congregation, 'id'> = {
      name: 'Congregação Nova',
      locatedOn: 'Campinas, SP',
      cities: ['Campinas', 'Valinhos'],
      settings: {
        designationAccessExpiryDays: 30,
        shouldDesignationBlockAfterExpired: true,
      },
    };

    const result = await lastValueFrom(service.add(input));

    expect(setDoc).toHaveBeenCalledWith(
      { id: 'generated-cong-id' },
      {
        ...input,
        id: 'generated-cong-id',
      },
    );
    expect(result).toEqual({
      ...input,
      id: 'generated-cong-id',
    });
  });
});

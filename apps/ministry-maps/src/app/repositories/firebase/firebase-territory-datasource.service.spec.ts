import { TestBed } from '@angular/core/testing';
import { collection, collectionData, collectionGroup, doc, getDocs, Firestore, query } from '@angular/fire/firestore';
import { lastValueFrom, of } from 'rxjs';
import { MockProvider } from 'ng-mocks';

import { FirebaseTerritoryDatasourceService } from './firebase-territory-datasource.service';
import { Territory, TerritoryIcon } from '../../../models/territory';
import { TerritoryVisitHistory } from '../../../models/territory-visit-history';
import { VisitOutcomeEnum } from '../../../models/enums/visit-outcome';

jest.mock('@angular/fire/firestore', () => ({
  ...jest.requireActual('@angular/fire/firestore'),
  collection: jest.fn(),
  collectionData: jest.fn(),
  collectionGroup: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
}));

const territory = (id: string): Territory =>
  ({
    id,
    congregationId: 'CONGREGATION-1',
    city: 'São Paulo',
    address: `Rua ${id}, 1`,
    note: '',
    icon: TerritoryIcon.MAN,
  }) as Territory;

const historyEntry = (id: string, territoryId: string): TerritoryVisitHistory =>
  ({
    id,
    territoryId,
    congregationId: 'CONGREGATION-1',
    visitOutcome: VisitOutcomeEnum.SPOKE,
    isRevisit: false,
    date: new Date(2024, 0, 1),
    notes: `visit ${id}`,
  }) as TerritoryVisitHistory;

describe('FirebaseTerritoryDatasourceService — getAllByCongregation with history', () => {
  let service: FirebaseTerritoryDatasourceService;

  /** Makes the mocked territories collection emit the given snapshot. */
  const mockTerritoriesSnapshot = (territories: Territory[]) => {
    (collectionData as jest.Mock).mockReturnValue(of(territories));
  };

  /** Makes the mocked collection-group query return history docs whose parent path encodes the territory id. */
  const mockHistoryGroupQuery = (entries: Array<{ data: TerritoryVisitHistory; parentTerritoryId: string }>) => {
    (getDocs as jest.Mock).mockResolvedValue({
      docs: entries.map(({ data, parentTerritoryId }) => ({
        data: () => ({ ...data, date: { toDate: () => data.date } }),
        ref: {
          parent: {
            parent: {
              id: parentTerritoryId,
            },
          },
        },
      })),
    });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockProvider(Firestore)],
    });

    (collection as jest.Mock).mockReturnValue({ withConverter: jest.fn().mockReturnThis() });
    (doc as jest.Mock).mockImplementation((_parent: unknown, id: string) => ({ id }));
    (collectionGroup as jest.Mock).mockReturnValue({});
    // The service chains `.where(...).withConverter(...)` on the query — provide a chainable stub.
    (query as unknown as jest.Mock).mockImplementation((source: unknown) => ({
      source,
      withConverter: jest.fn().mockReturnThis(),
    }));

    service = TestBed.inject(FirebaseTerritoryDatasourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resolves every territory history in a single collection-group query, grouped by territory', async () => {
    mockTerritoriesSnapshot([territory('T1'), territory('T2')]);
    mockHistoryGroupQuery([
      { data: historyEntry('H1', 'T1'), parentTerritoryId: 'T1' },
      { data: historyEntry('H2', 'T2'), parentTerritoryId: 'T2' },
      { data: historyEntry('H3', 'T1'), parentTerritoryId: 'T1' },
    ]);

    const result = await lastValueFrom(service.getAllByCongregation('CONGREGATION-1', { getHistory: true }));

    // One collection-group read instead of one subcollection query per territory.
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(collectionGroup).toHaveBeenCalledWith(expect.anything(), 'history');

    const t1 = result.find((t) => t.id === 'T1');
    const t2 = result.find((t) => t.id === 'T2');
    expect(t1?.history?.map((h) => h.id)).toEqual(['H1', 'H3']);
    expect(t2?.history?.map((h) => h.id)).toEqual(['H2']);
  });

  it('falls back to the document path for the territory id when the stamp is missing', async () => {
    mockTerritoriesSnapshot([territory('T1')]);
    const unstamped = { ...historyEntry('H1', ''), territoryId: undefined };
    mockHistoryGroupQuery([{ data: unstamped as TerritoryVisitHistory, parentTerritoryId: 'T1' }]);

    const result = await lastValueFrom(service.getAllByCongregation('CONGREGATION-1', { getHistory: true }));

    expect(result[0].history?.map((h) => h.id)).toEqual(['H1']);
  });

  it('returns an empty array immediately for congregations without territories (no hang)', async () => {
    mockTerritoriesSnapshot([]);

    const result = await lastValueFrom(service.getAllByCongregation('EMPTY-CONGREGATION', { getHistory: true }));

    expect(result).toEqual([]);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('skips the history resolution entirely when getHistory is not requested', async () => {
    mockTerritoriesSnapshot([territory('T1')]);

    const result = await lastValueFrom(service.getAllByCongregation('CONGREGATION-1'));

    expect(getDocs).not.toHaveBeenCalled();
    expect(result[0].history).toBeUndefined();
  });
});

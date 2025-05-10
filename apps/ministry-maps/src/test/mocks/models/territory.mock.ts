import { Territory, TerritoryIcon } from '../../../models/territory';
import { congregationMock } from './congregation.mock';
import { TerritoryVisitHistory } from '../../../models/territory-visit-history';
import { VisitOutcomeEnum } from '../../../models/enums/visit-outcome';
import { TerritoryRepository } from '../../../app/repositories/territories.repository';
import { EMPTY, Observable, of } from 'rxjs';

const mockDateBuilder = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return date;
};

// MOCK CLASSES
export class TerritoryRepositoryMock implements TerritoryRepository {
  getTerritoryVisitHistory(id: string): Observable<TerritoryVisitHistory[]> {
    return of([]);
  }

  batchUpdate(territories: Territory[]): Observable<void> {
    return EMPTY;
  }

  getAllByCongregation(congregationId: string): Observable<Territory[]> {
    return of([]);
  }

  getAllInIds(ids: string[]): Observable<Territory[]> {
    return of([]);
  }

  getNextPositionIndexForCity(city: string): Observable<number> {
    return of(0);
  }

  setVisitHistory(territoryId: string, visitHistory: TerritoryVisitHistory): Observable<void> {
    return EMPTY;
  }

  getAllByCongregationAndCity(congregationId: string, city: string): Observable<Territory[]> {
    return of([]);
  }

  add(territory: Omit<Territory, 'id'>): Observable<Territory> {
    return of();
  }

  delete(id: string): Observable<void> {
    return EMPTY;
  }

  update(territory: Territory): Observable<void> {
    return EMPTY;
  }

  deleteVisitHistory(territoryId: string, historyId: string): Observable<void> {
    return EMPTY;
  }
}

// TERRITORY
const mockVisit1: TerritoryVisitHistory = {
  id: 'VISIT-1',
  visitOutcome: VisitOutcomeEnum.SPOKE,
  isRevisit: false,
  date: mockDateBuilder(7),
  notes: 'This is a test note about Visit 1, it went well, showed Mat 24:14',
};

const mockVisit2: TerritoryVisitHistory = {
  id: 'VISIT-2',
  visitOutcome: VisitOutcomeEnum.NOT_ANSWERED,
  isRevisit: false,
  date: mockDateBuilder(7),
  notes: `Couldn't find this time, will try tomorrow`,
};

const mockTerritory: Territory = {
  id: 'TERRITORY1234',
  congregationId: congregationMock.id,
  icon: TerritoryIcon.MAN,
  note: 'Territory note that adds some information',
  lastVisit: new Date(),
  address: 'Test Street, 1234',
  city: congregationMock.cities[0],
  mapsLink: 'https://maps.app.goo.gl/5mid2cabJ2R72fUL8',
  positionIndex: 0,
  history: [mockVisit1, mockVisit2],
  recentHistory: [mockVisit1, mockVisit2],
};

export const territoryMockBuilder = (territory: Partial<Territory>): Territory => {
  return {
    ...mockTerritory,
    lastVisit: mockDateBuilder(10),
    ...territory,
  };
};

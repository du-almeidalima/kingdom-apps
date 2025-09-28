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

const mockVisit3: TerritoryVisitHistory = {
  id: 'VISIT-3',
  visitOutcome: VisitOutcomeEnum.SPOKE,
  isRevisit: true,
  date: mockDateBuilder(14),
  notes: 'Great conversation about hope for the future, left a magazine',
};

const mockVisit4: TerritoryVisitHistory = {
  id: 'VISIT-4',
  visitOutcome: VisitOutcomeEnum.SPOKE,
  isRevisit: false,
  date: mockDateBuilder(21),
  notes: 'Not interested at this time, was polite but declined literature',
};

export const mockTerritory1: Territory = {
  id: 'TERRITORY1',
  congregationId: congregationMock.id,
  icon: TerritoryIcon.MAN,
  note: 'Territory 1 Note',
  lastVisit: new Date(),
  address: 'Territory 1 Street 1',
  city: congregationMock.cities[0],
  mapsLink: 'https://maps.app.goo.gl/5mid2cabJ2R72fUL8',
  positionIndex: 0,
  history: [mockVisit1, mockVisit2],
  recentHistory: [mockVisit1, mockVisit2],
};

export const mockTerritory2: Territory = {
  id: 'TERRITORY2',
  congregationId: congregationMock.id,
  icon: TerritoryIcon.WOMAN,
  note: 'Territory 2 Note',
  lastVisit: new Date(),
  address: 'Territory 2 Street 5',
  city: congregationMock.cities[0],
  mapsLink: 'https://maps.app.goo.gl/6nke3dabK3S83gVM9',
  positionIndex: 1,
  history: [mockVisit3, mockVisit4],
  recentHistory: [mockVisit3, mockVisit4],
};

export const mockTerritory3: Territory = {
  id: 'TERRITORY3',
  congregationId: congregationMock.id,
  icon: TerritoryIcon.MAN,
  note: 'Territory 3 Note',
  lastVisit: new Date(),
  address: 'Territory 3 Avenue 12',
  city: congregationMock.cities[1],
  mapsLink: 'https://maps.app.goo.gl/7pke4eabL4T94hWN0',
  positionIndex: 0,
  history: [mockVisit1, mockVisit3],
  recentHistory: [mockVisit1, mockVisit3],
};

export const mockTerritory4: Territory = {
  id: 'TERRITORY4',
  congregationId: congregationMock.id,
  icon: TerritoryIcon.WOMAN,
  note: 'Territory 4 Note',
  lastVisit: new Date(),
  address: 'Territory 4 Boulevard 8',
  city: congregationMock.cities[2],
  mapsLink: 'https://maps.app.goo.gl/8qke5fabM5U05iXO1',
  positionIndex: 0,
  history: [mockVisit2, mockVisit4],
  recentHistory: [mockVisit2, mockVisit4],
};

export const territoryMockBuilder = (territory: Partial<Territory>): Territory => {
  return {
    ...mockTerritory1,
    lastVisit: mockDateBuilder(10),
    ...territory,
  };
};

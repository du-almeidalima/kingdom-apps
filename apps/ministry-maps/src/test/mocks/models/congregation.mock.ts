import { Congregation } from '../../../models/congregation';
import { CongregationRepository } from '../../../app/repositories/congregation.repository';
import { Observable, of } from 'rxjs';
import { mockBuilderFn } from '../utils';

// MOCK CLASSES
export class CongregationRepositoryMock implements CongregationRepository {
  getById(id: string): Observable<Congregation | undefined> {
    return of(mockBuilderFn(congregationMock, { id }));
  }

  getCongregations(): Observable<Pick<Congregation, 'name' | 'id'>[]> {
    return of([{ name: congregationMock.name, id: congregationMock.id }, {
      id: congregationMock2.id,
      name: congregationMock2.name,
    }]);
  }

  update(congregation: Congregation): Observable<void> {
    return of(void 0);
  }
}

// CONGREGATION
export const congregationMock: Congregation = {
  id: 'CONGREGATION-1',
  name: 'LS Test Congregation',
  cities: ['City 1', 'City 2', 'City 3'],
  locatedOn: 'City 1',
  settings: {
    designationAccessExpiryDays: 45,
    shouldDesignationBlockAfterExpired: false
  }

};

export const congregationMock2: Congregation = {
  id: 'CONGREGATION-2',
  name: 'LS Test Congregation 2',
  cities: ['City 3', 'City 4', 'City 5'],
  locatedOn: 'City 3',
  settings: {
    designationAccessExpiryDays: 45,
    shouldDesignationBlockAfterExpired: false
  }
};

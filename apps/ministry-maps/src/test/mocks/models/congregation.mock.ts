import { Congregation } from '../../../models/congregation';
import { CongregationRepository } from '../../../app/repositories/congregation.repository';
import { Observable, of } from 'rxjs';
import { mockBuilderFn } from '../utils';

// MOCK CLASSES
export class CongregationRepositoryMock implements CongregationRepository {
  getById(id: string): Observable<Congregation | undefined> {
    return of(mockBuilderFn(congregationMock, { id }));
  }
}

// CONGREGATION
export const congregationMock: Congregation = {
  id: 'CONGREGATION-1',
  name: 'LS Test Congregation',
  cities: ['City 1', 'City 2', 'City 3'],
  locatedOn: 'City 1',
};

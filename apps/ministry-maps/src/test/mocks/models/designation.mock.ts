import { EMPTY, Observable } from 'rxjs';
import { DesignationRepository } from '../../../app/repositories/designation.repository';
import { Designation } from '../../../models/designation';

// MOCK CLASSES
export class DesignationRepositoryMock implements DesignationRepository {
  add(_designation: Omit<Designation, 'id'>): Observable<Designation> {
    return EMPTY;
  }

  getById(_id: string): Observable<Designation | undefined> {
    return EMPTY;
  }

  update(_designationTerritory: Designation): Observable<void> {
    return EMPTY;
  }
}

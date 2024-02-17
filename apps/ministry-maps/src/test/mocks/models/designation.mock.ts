import { EMPTY, Observable } from 'rxjs';
import { DesignationRepository } from '../../../app/repositories/designation.repository';
import { Designation } from '../../../models/designation';

// MOCK CLASSES
export class DesignationRepositoryMock implements DesignationRepository {
  add(designation: Omit<Designation, 'id'>): Observable<Designation> {
    return EMPTY;
  }

  getById(id: string): Observable<Designation | undefined> {
    return EMPTY;
  }

  update(designationTerritory: Designation): Observable<void> {
    return EMPTY;
  }
}

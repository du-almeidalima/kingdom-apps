import { Observable } from 'rxjs';
import { Designation } from '../../models/designation';

export abstract class DesignationRepository {
  abstract getById(id: string): Observable<Designation | undefined>;
  abstract add(designation: Omit<Designation, 'id'>): Observable<Designation>;
  abstract update(designationTerritory: Designation): Observable<void>;
}

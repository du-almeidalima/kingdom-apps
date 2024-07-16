import { Observable } from 'rxjs';
import { HearingDesignation } from '../../models/hearing-designation';

export abstract class HearingDesignationRepository {
  abstract getById(id: string): Observable<HearingDesignation | undefined>;
  abstract add(designation: Omit<HearingDesignation, 'id'>): Observable<HearingDesignation>;
  abstract update(designationTerritory: HearingDesignation): Observable<void>;
}

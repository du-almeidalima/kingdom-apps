import { Observable } from 'rxjs';
import { HearingTerritory } from '../../models/hearing-territory';

export abstract class HearingTerritoryRepository {
  abstract getAllByCongregation(congregationId: string): Observable<HearingTerritory[]>;
  abstract getAllInIds(ids: string[]): Observable<HearingTerritory[]>;
  abstract add(territory: Omit<HearingTerritory, 'id'>): Observable<HearingTerritory>;
  abstract update(territory: HearingTerritory): Observable<void>;
  abstract batchUpdate(territories: HearingTerritory[]): Observable<void>;
  abstract delete(id: string): Observable<void>;
}

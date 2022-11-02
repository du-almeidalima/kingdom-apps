import { Observable } from 'rxjs';
import { Territory } from '../../models/territory';
import { TerritoryVisitHistory } from '../../models/territory-visit-history';

export abstract class TerritoryRepository {
  abstract getAllByCongregation(congregationId: string): Observable<Territory[]>;

  abstract getAllByCongregationAndCity(congregationId: string, city: string): Observable<Territory[]>;

  abstract getAllInIds(ids: string[]): Observable<Territory[]>;

  abstract add(territory: Omit<Territory, 'id'>): Observable<Territory>;

  abstract update(territory: Territory): Observable<void>;

  abstract addVisitHistory(territoryId: string, visitHistory: TerritoryVisitHistory): Observable<void>;
}

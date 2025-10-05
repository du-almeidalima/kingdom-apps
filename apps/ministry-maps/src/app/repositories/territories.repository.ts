import { Observable } from 'rxjs';
import { Territory } from '../../models/territory';
import { TerritoryVisitHistory } from '../../models/territory-visit-history';

export type TerritoryRepositoryQueryOptions = {
  /** When true, fetches the visit history of the territory. */
  getHistory?: boolean;
};

export abstract class TerritoryRepository {
  abstract getAllByCongregation(
    congregationId: string,
    options?: TerritoryRepositoryQueryOptions
  ): Observable<Territory[]>;

  abstract getAllByCongregationAndCities(congregationId: string, cities: string[]): Observable<Territory[]>;

  abstract getAllInIds(ids: string[]): Observable<Territory[]>;

  abstract add(territory: Omit<Territory, 'id'>): Observable<Territory>;

  abstract update(territory: Territory): Observable<void>;

  abstract batchUpdate(territories: Territory[]): Observable<void>;

  abstract delete(id: string): Observable<void>;

  abstract getTerritoryVisitHistory(id: string): Observable<TerritoryVisitHistory[]>;

  /**
   * Writes the History for a Territory. If the History has an id, it will be updated. If not, it will be added.
   */
  abstract setVisitHistory(territoryId: string, visitHistory: TerritoryVisitHistory): Observable<void>;

  /** Deletes an entry of the sub-collection {@code history} based on its ID */
  abstract deleteVisitHistory(territoryId: string, historyId: string): Observable<void>;

  abstract getNextPositionIndexForCity(city: string): Observable<number>;
}

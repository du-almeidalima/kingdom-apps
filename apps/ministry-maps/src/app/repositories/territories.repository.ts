import { Observable } from 'rxjs';
import { Territory } from '../../models/territory';

export abstract class TerritoryRepository {
  abstract getAllByCongregation(congregationId: string): Observable<Territory[]>;
  abstract add(territory: Territory): Observable<Territory>;
}

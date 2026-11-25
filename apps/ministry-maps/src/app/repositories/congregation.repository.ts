import { Observable } from 'rxjs';
import { Congregation } from '../../models/congregation';

export abstract class CongregationRepository {
  abstract getById(id: string): Observable<Congregation | undefined>;
  abstract getCongregations(): Observable<Pick<Congregation, 'name' | 'id'>[]>;
  abstract add(congregation: Omit<Congregation, 'id'>): Observable<Congregation>;
  abstract update(congregation: Congregation): Observable<void>;
}

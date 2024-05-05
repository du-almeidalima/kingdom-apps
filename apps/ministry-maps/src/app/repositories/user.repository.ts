import { Observable } from 'rxjs';
import { User } from '../../models/user';

export abstract class UserRepository {
  abstract getById(id: string): Observable<User | undefined>;
  abstract update(user: User): Observable<User>;
  abstract delete(userid: string): Observable<void>;
  abstract getAllByCongregation(congregationId: string): Observable<User[]>
}

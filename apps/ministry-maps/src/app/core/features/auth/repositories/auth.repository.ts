import { Observable } from 'rxjs';
import { User } from '../../../../../models/user';

export abstract class AuthRepository {
  abstract signInWithProvider(providers?: string): Observable<User>;
}

import { Observable } from 'rxjs';
import { User } from '../../models/user';
import { FirebaseUserModel } from '../../models/firebase/firebase-user-model';

export abstract class UserRepository {
  abstract getAll(): Observable<FirebaseUserModel[]>;
  abstract getById(id: string): Observable<User | undefined>;
}

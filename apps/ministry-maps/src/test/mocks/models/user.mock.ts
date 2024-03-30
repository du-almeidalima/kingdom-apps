import { User } from '../../../models/user';
import { RoleEnum } from '../../../models/enums/role';
import { congregationMock } from './congregation.mock';
import { UserStateService } from '../../../app/state/user.state.service';
import { UserRepository } from '../../../app/repositories/user.repository';
import { Observable, of } from 'rxjs';

// MOCK CLASSES
export class UserStateServiceMock extends UserStateService {}

export class UserRepositoryMock extends UserRepository {
  getById(_: string): Observable<User | undefined> {
    return of(organizerUser);
  }

  update(user: User): Observable<User> {
    return of(user);
  }
}
// USERS
export const organizerUser: User = {
  id: 'A1B2C3',
  name: 'TestUser',
  email: 'test.user@email.com',
  photoUrl: 'https://i.stack.imgur.com/l60Hf.png',
  role: RoleEnum.ORGANIZER,
  congregation: congregationMock
};

export const userMockBuilder = (user: Partial<User>) => {
  return {
    ...organizerUser,
    ...user
  }
}

// USER STATE SERVICE
const organizerUserStateServiceMock = new UserStateServiceMock();
organizerUserStateServiceMock.setUser(organizerUser);

export {organizerUserStateServiceMock}


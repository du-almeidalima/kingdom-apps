import { User } from '../../../models/user';
import { RoleEnum } from '../../../models/enums/role';
import { congregationMock } from './congregation.mock';
import { UserStateService } from '../../../app/state/user.state.service';
import { UserRepository } from '../../../app/repositories/user.repository';
import { EMPTY, Observable, of } from 'rxjs';

// MOCK CLASSES
export class UserStateServiceMock extends UserStateService {}

export class UserRepositoryMock extends UserRepository {
  getById(_: string): Observable<User | undefined> {
    return of(organizerUser);
  }

  update(user: User): Observable<User> {
    return of(user);
  }

  getAllByCongregation(_: string): Observable<User[]> {
    return of([organizerUser, elderUser]);
  }

  delete(_: string): Observable<void> {
    return EMPTY;
  }
}

// USERS
export const publisherUser: User = {
  id: 'A1B2C3',
  name: 'Publisher User',
  email: 'test.publisher@email.com',
  photoUrl: 'https://i.stack.imgur.com/l60Hf.png',
  role: RoleEnum.ORGANIZER,
  congregation: congregationMock
};

export const organizerUser: User = {
  id: 'ORG123',
  name: 'Organizer Test User',
  email: 'org.user@email.com',
  photoUrl: 'https://i.stack.imgur.com/l60Hf.png',
  role: RoleEnum.ORGANIZER,
  congregation: congregationMock
};

export const elderUser: User = {
  id: 'ELD123',
  name: 'Elder Test User',
  email: 'elder.test@email.com',
  photoUrl: 'https://i.stack.imgur.com/l60Hf.png',
  role: RoleEnum.ORGANIZER,
  congregation: congregationMock
};

export const adminUser: User = {
  id: 'ADM123',
  name: 'Admin Test User',
  email: 'admin.user@email.com',
  photoUrl: 'https://i.stack.imgur.com/l60Hf.png',
  role: RoleEnum.ADMIN,
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


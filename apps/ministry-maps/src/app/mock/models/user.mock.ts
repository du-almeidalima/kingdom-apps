import { User } from '../../../models/user';
import { RoleEnum } from '../../../models/enums/role';
import { CONGREGATION_MOCK } from './congregation.mock';

export const ADMIN_USER_MOCK: User = {
  id: '1234567',
  name: 'Mock User',
  role: RoleEnum.ADMIN,
  email: 'mock.user@test.com',
  photoUrl: 'https://some-picture-url.com',
  congregation: CONGREGATION_MOCK
}

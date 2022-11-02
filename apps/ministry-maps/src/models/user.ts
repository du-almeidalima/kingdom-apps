import { RoleEnum } from './enums/role';
import { Congregation } from './congregation';

export type User = {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  congregation: Congregation | undefined;
  role: RoleEnum;
};

import { Role } from './enums/role';

export type User = {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  congregationId: string;
  role: Role;
};

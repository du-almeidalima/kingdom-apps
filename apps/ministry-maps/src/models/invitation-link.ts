import { Congregation } from './congregation';
import { RoleEnum } from './enums/role';

export type InvitationLink = {
  id: string;
  createdBy: string;
  congregation: Congregation;
  createdAt: Date;
  /** If the invitation should be only for a specific person, their email can be defined here */
  email?: string;
  role: RoleEnum;
  /** When used, this is set to true */
  isValid: boolean;
}

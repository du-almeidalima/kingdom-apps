import { RoleEnum } from '../../../../models/enums/role';

export const EDIT_ALLOWED = [RoleEnum.ADMIN, RoleEnum.ELDER, RoleEnum.SUPERINTENDENT];

export const TERRITORY_ALLOWED_ROLES = [RoleEnum.ORGANIZER, RoleEnum.ADMIN, RoleEnum.ELDER, RoleEnum.SUPERINTENDENT];

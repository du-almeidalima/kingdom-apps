export enum RoleEnum {
  /** Maximum level of access, granted to only maintainers of this application */
  APP_ADMIN = 'APP_ADMIN',
  /** Congregation Admin (usually the SS) */
  ADMIN = 'ADMIN',
  PUBLISHER = 'PUBLISHER',
  ELDER = 'ELDER',
  /** Brothers that qualifies to manage field services group work */
  ORGANIZER = 'ORGANIZER',
  SUPERINTENDENT = 'SUPERINTENDENT',
}

export const getTranslatedRole = (role: RoleEnum) => {
  switch (role) {
    case RoleEnum.APP_ADMIN:
      return 'App Admin.';
    case RoleEnum.ORGANIZER:
      return 'Organizador';
    case RoleEnum.ADMIN:
      return 'Admin';
    case RoleEnum.ELDER:
      return 'Ancião';
    case RoleEnum.SUPERINTENDENT:
      return 'Superintendente';
    case RoleEnum.PUBLISHER:
    default:
      return 'Publicador';
  }
}

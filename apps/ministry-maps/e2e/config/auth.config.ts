import { DEFAULT_SEED_IDS } from '../seed/default.seed';

/** Default password applied to every seeded Auth emulator user by the seeder. */
export const DEFAULT_PASSWORD = 'test-password-123';

/** Roles supported by the auth fixture. */
export type TestRole =
  | 'admin'
  | 'publisher'
  | 'elder'
  | 'organizer'
  | 'superintendent'
  | 'app_admin';

/**
 * Maps test roles to seeded user uids from {@link DEFAULT_SEED_IDS} so the auth
 * fixture can mint custom tokens for the correct identity. Every role maps to a
 * baseline user carrying the matching `RoleEnum` (e.g. `'elder'` → an `ELDER`
 * user, `'app_admin'` → an `APP_ADMIN` user).
 */
export const ROLE_UIDS: Record<TestRole, string> = {
  admin: DEFAULT_SEED_IDS.adminUser,
  publisher: DEFAULT_SEED_IDS.publisherUsers[0],
  elder: DEFAULT_SEED_IDS.elderUser,
  organizer: DEFAULT_SEED_IDS.organizerUser,
  superintendent: DEFAULT_SEED_IDS.superintendentUser,
  app_admin: DEFAULT_SEED_IDS.appAdminUser,
};

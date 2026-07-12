import { DEFAULT_SEED_IDS } from '../seed/default.seed';

/** Default password applied to every seeded Auth emulator user by the seeder. */
export const DEFAULT_PASSWORD = 'test-password-123';

/** Roles supported by the auth fixture. */
export type TestRole = 'admin' | 'publisher';

/**
 * Maps test roles to seeded user uids from {@link DEFAULT_SEED_IDS} so the auth
 * fixture can mint custom tokens for the correct identity.
 */
export const ROLE_UIDS: Record<TestRole, string> = {
  admin: DEFAULT_SEED_IDS.adminUser,
  publisher: DEFAULT_SEED_IDS.publisherUsers[0],
};

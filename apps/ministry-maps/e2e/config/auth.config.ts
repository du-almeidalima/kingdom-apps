import { DEFAULT_SEED_IDS } from '../seed/default.seed';

/**
 * Maps test roles to seeded user uids from {@link DEFAULT_SEED_IDS} so the auth
 * fixture can mint custom tokens for the correct identity.
 */
export const AUTH_CONFIG = {
  /** Default password used for all seeded Auth emulator users. */
  defaultPassword: 'test-password-123',

  /** Returns the seeded uid for a given test role. */
  roleUid(role: TestRole): string {
    const uids: Record<TestRole, string> = {
      admin: DEFAULT_SEED_IDS.adminUser,
      publisher: DEFAULT_SEED_IDS.publisherUsers[0],
    };
    return uids[role];
  },
} as const;

/** Roles supported by the auth fixture. */
export type TestRole = 'admin' | 'publisher';

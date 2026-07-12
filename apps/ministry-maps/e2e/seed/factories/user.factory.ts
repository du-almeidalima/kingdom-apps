import { randomUUID } from 'crypto';

import { RoleEnum } from '../../../src/models/enums/role';
import { UserSeed } from '../types';

/**
 * Builds a realistic user seed. Defaults to a `PUBLISHER`; the `id` doubles as
 * the Auth emulator `uid`. Always provide a `congregationId` (directly or via
 * override) so the seeder can link the user to a congregation. Omit
 * `password` to use the seeder's `DEFAULT_PASSWORD` fallback.
 */
export function buildUser(over: Partial<UserSeed> = {}): UserSeed {
  const id = over.id ?? `user-${randomUUID()}`;

  return {
    id,
    name: 'João da Silva',
    email: `${id}@example.com`,
    photoUrl: 'https://i.pravatar.cc/150?u=' + id,
    role: RoleEnum.PUBLISHER,
    congregationId: '',
    ...over,
  };
}

import { randomUUID } from 'crypto';

import { RoleEnum } from '../../../src/models/enums/role';
import { InvitationLinkSeed } from '../types';

/**
 * Builds a realistic invitation-link seed in the app's **creation-time** shape
 * (`docs/domain/data-model.md` §2.6): `isValid: true`, `createdBy` carrying the
 * creator's **email** (not uid), and no consumption fields. The seeder writes
 * `congregationId` as a `DocumentReference` and embeds the `id` in the body —
 * always provide a `congregationId` (directly or via override).
 *
 * To model a consumed invite, override with `isValid: false, usedAt, usedBy` —
 * the seeder writes what it's given.
 */
export function buildInvitationLink(over: Partial<InvitationLinkSeed> = {}): InvitationLinkSeed {
  return {
    id: `invite-${randomUUID()}`,
    createdBy: 'carlos.almeida@example.com',
    congregationId: '',
    createdAt: new Date(),
    email: undefined,
    role: RoleEnum.ORGANIZER,
    isValid: true,
    ...over,
  };
}

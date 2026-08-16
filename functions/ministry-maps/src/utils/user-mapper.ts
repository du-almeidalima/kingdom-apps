import type { UserDoc, PublicUser } from '../models/user';

/**
 * POJO projection for callable responses — raw doc data embeds a DocumentReference, which
 * does not survive the callable's JSON envelope.
 */
export function toPublicUser(user: Partial<UserDoc> & { id: string; role: UserDoc['role'] }): PublicUser {
  return {
    id: user.id,
    email: user.email ?? '',
    name: user.name ?? '',
    photoUrl: user.photoUrl ?? '',
    role: user.role,
    congregationId: user.congregation?.id ?? null,
  };
}

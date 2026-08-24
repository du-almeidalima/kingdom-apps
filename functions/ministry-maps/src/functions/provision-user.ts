import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import logger from 'firebase-functions/logger';
import { db } from '../config/firebase';
import { toPublicUser } from '../utils/user-mapper';
import type { UserDoc, PublicUser } from '../models/user';
import type { InvitationDoc } from '../models/invitation';

export interface ProvisionUserRequest {
  inviteId: string;
}

/**
 * Creates the caller's user profile, validating and consuming the invitation link in the same
 * transaction. The only path allowed creating `users` documents (rules deny client creation).
 * Idempotent: an already-provisioned caller gets its profile back and the invite is untouched.
 */
export const provisionUserFromInvite = onCall<ProvisionUserRequest, Promise<PublicUser>>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in.');
  }

  const inviteId = request.data?.inviteId;
  if (typeof inviteId !== 'string' || inviteId.length === 0) {
    throw new HttpsError('invalid-argument', 'The inviteId is required.');
  }

  const callerUid = request.auth.uid;
  const callerToken = request.auth.token;
  const callerEmail = (callerToken.email || '').toLowerCase();

  const existingUserSnapshot = await db.collection('users').doc(callerUid).get();
  if (existingUserSnapshot.exists) {
    return toPublicUser(existingUserSnapshot.data() as UserDoc);
  }

  return db.runTransaction(async (transaction) => {
    const inviteRef = db.collection('invitation_links').doc(inviteId);
    const inviteSnapshot = await transaction.get(inviteRef);

    if (!inviteSnapshot.exists) {
      throw new HttpsError('not-found', 'Invitation link not found.');
    }

    const invite = inviteSnapshot.data() as InvitationDoc;

    if (!invite.isValid) {
      throw new HttpsError('failed-precondition', 'INVITATION_ALREADY_USED');
    }

    if (invite.role === 'APP_ADMIN') {
      throw new HttpsError('permission-denied', 'APP_ADMIN role cannot be granted by invitation.');
    }

    if (invite.email && callerEmail !== String(invite.email).toLowerCase()) {
      throw new HttpsError('permission-denied', 'INVALID_EMAIL');
    }

    const userRef = db.collection('users').doc(callerUid);

    // Guard against a concurrent provisioning of the same caller.
    const userSnapshot = await transaction.get(userRef);
    if (userSnapshot.exists) {
      return toPublicUser(userSnapshot.data() as UserDoc);
    }

    const newUser: UserDoc = {
      id: callerUid,
      email: callerToken.email ?? '',
      name: callerToken.name ?? 'Unidentified',
      photoUrl: callerToken.picture ?? '',
      role: invite.role,
      congregation: invite.congregation,
    };

    transaction.set(userRef, newUser);
    transaction.update(inviteRef, {
      isValid: false,
      usedAt: FieldValue.serverTimestamp(),
      usedBy: callerToken.email ?? callerUid,
    });

    logger.info(`Provisioned user [${callerUid}] with role [${invite.role}] from invitation [${inviteId}].`);

    return toPublicUser(newUser);
  });
});

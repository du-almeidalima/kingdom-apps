'use strict';

const { HttpsError, onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const logger = require('firebase-functions/logger');

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started
initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = getFirestore();

/** POJO projection for callable responses — raw doc data embeds a DocumentReference, which
 * does not survive the callable's JSON envelope. */
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email ?? '',
    name: user.name ?? '',
    photoUrl: user.photoUrl ?? '',
    role: user.role,
    congregationId: user.congregation && user.congregation.id ? user.congregation.id : null,
  };
}

exports.deleteUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in.');
  }

  const usersCollection = await db.collection('users');

  const currentUserQuerySnapshot = await usersCollection.doc(request.auth.uid).get();
  const userQuerySnapshot = await usersCollection.where('id', '==', request.data).get();


  if (userQuerySnapshot.empty) {
    logger.warn(`User ${request.data} not found!`);
    return;
  }

  // Only Authenticated Admin users
  if (!currentUserQuerySnapshot.exists) {
    logger.warn(`Caller user ${request.auth.uid} not found.`);
    return;
  }

  // ADMIN can only delete people from same congregation, only APP_ADMIN can delete users from anywhere.
  const currentUser = currentUserQuerySnapshot.data();
  const user = userQuerySnapshot.docs[0].data()

  logger.info(currentUser);
  logger.info(user);

  if (currentUser.role === 'APP_ADMIN' || currentUser.role === 'ADMIN') {
    const isFromSameCongregation = currentUser?.congregation?.id === user?.congregation?.id;

    if (isFromSameCongregation || currentUser.role === 'APP_ADMIN') {
      try {
        await getAuth().deleteUser(user.id);
        logger.info(`User ${user.id} has been deleted successfully!`);
      } catch (error) {
        logger.error(`Error while deleting user [${user.id}]: `, error);
      }
    }
  }
});

/**
 * Creates the caller's user profile, validating and consuming the invitation link in the same
 * transaction. The only path allowed to create `users` documents (rules deny client creation).
 * Idempotent: an already-provisioned caller gets its profile back and the invite is untouched.
 */
exports.provisionUserFromInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in.');
  }

  const inviteId = request.data?.inviteId;
  if (typeof inviteId !== 'string' || inviteId.length === 0) {
    throw new HttpsError('invalid-argument', 'The inviteId is required.');
  }

  const callerUid = request.auth.uid;
  const callerEmail = (request.auth.token.email || '').toLowerCase();

  const existingUserSnapshot = await db.collection('users').doc(callerUid).get();
  if (existingUserSnapshot.exists) {
    return toPublicUser(existingUserSnapshot.data());
  }

  return db.runTransaction(async (transaction) => {
    const inviteRef = db.collection('invitation_links').doc(inviteId);
    const inviteSnapshot = await transaction.get(inviteRef);

    if (!inviteSnapshot.exists) {
      throw new HttpsError('not-found', 'Invitation link not found.');
    }

    const invite = inviteSnapshot.data();

    if (invite.isValid !== true) {
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
      return toPublicUser(userSnapshot.data());
    }

    const newUser = {
      id: callerUid,
      email: request.auth.token.email ?? '',
      name: request.auth.token.name ?? 'Unidentified',
      photoUrl: request.auth.token.picture ?? '',
      role: invite.role,
      congregation: invite.congregation,
    };

    transaction.set(userRef, newUser);
    transaction.update(inviteRef, {
      isValid: false,
      usedAt: FieldValue.serverTimestamp(),
      usedBy: request.auth.token.email ?? callerUid,
    });

    logger.info(
      `Provisioned user [${callerUid}] with role [${invite.role}] from invitation [${inviteId}].`
    );

    return toPublicUser(newUser);
  });
});

import { HttpsError, onCall } from 'firebase-functions/v2/https';
import logger from 'firebase-functions/logger';
import { db, auth } from '../config/firebase';
import type { UserDoc } from '../models/user';

export const deleteUser = onCall<string>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in.');
  }

  const targetUserId = request.data;
  if (!targetUserId || typeof targetUserId !== 'string') {
    logger.warn('deleteUser called without target userId.');
    return;
  }

  const usersCollection = db.collection('users');
  const currentUserDoc = await usersCollection.doc(request.auth.uid).get();
  const userQuerySnapshot = await usersCollection.where('id', '==', targetUserId).get();

  if (userQuerySnapshot.empty) {
    logger.warn(`User ${targetUserId} not found!`);
    return;
  }

  if (!currentUserDoc.exists) {
    logger.warn(`Caller user ${request.auth.uid} not found.`);
    return;
  }

  const currentUser = currentUserDoc.data() as UserDoc;
  const targetUser = userQuerySnapshot.docs[0].data() as UserDoc;

  logger.info(`Caller: ${currentUser.id} (${currentUser.role}), Target: ${targetUser.id}`);

  if (currentUser.role === 'APP_ADMIN' || currentUser.role === 'ADMIN') {
    const isFromSameCongregation = currentUser?.congregation?.id === targetUser?.congregation?.id;

    if (isFromSameCongregation || currentUser.role === 'APP_ADMIN') {
      try {
        await auth.deleteUser(targetUser.id);
        logger.info(`User ${targetUser.id} has been deleted successfully!`);
      } catch (error) {
        logger.error(`Error while deleting user [${targetUser.id}]: `, error);
      }
    }
  }
});

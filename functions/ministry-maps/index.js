'use strict';

const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const logger = require('firebase-functions/logger');

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started
initializeApp({
  credential:  admin.credential.applicationDefault(),
});

const db = getFirestore();

exports.deleteUser = onCall(async (request) => {


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

import admin from 'firebase-admin';
import { log, error } from 'firebase-functions/logger';

export const setCustomClaims = async (user) => {
  const uid = user.uid;

  try {
    await admin.auth().setCustomUserClaims(uid, {
      admin: true
    });

    const acc = await admin.auth().getUser(uid);
    log(`${uid} created with custom claims: ${JSON.stringify(acc.customClaims)}`);
  } catch (err) {
    error(`Error setting custom claims: ${err}`);
  }

  return null;
};

export default {};

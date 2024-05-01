import admin from 'firebase-admin';
import { log, error } from 'firebase-functions/logger';
import { GameData } from '../types';

export const fixGameFreeThrowData = async () => {
  const db = admin.firestore();
  const gameList: GameData[] = [];

  log('running fixGameFreeThrowData');
  try {
    const querySnapshot = await db.collection('games').where('ftm', '>', 0).get();
    querySnapshot.docs.forEach((doc) => {
      const gameData = doc.data() as GameData;
      if (gameData.fta < gameData.ftm) {
        gameList.push({ ...gameData, id: doc.id });
      }
    });

    // * Update the free throw attempts to be the same as the free throws made
    const batch = db.batch();
    for (const gameData of gameList) {
      log(`Updating game ${gameData.id} for ${gameData.name} because fta is less than ftm`);
      const docRef = db.collection('games').doc(gameData.id);
      batch.update(docRef, { fta: gameData.ftm });
    }
    await batch.commit();
  } catch (e) {
    error('Error in fixGameFreeThrowData', e);
    throw e; // rethrow the error
  }
};

import admin from 'firebase-admin';
import { log, error } from 'firebase-functions/logger';

const statsToValidate = ['pts', 'stl', 'blk', 'ast', 'treb', 'fgm', 'fga', 'threepm', 'threepa'];

export const deleteBadGameData = async () => {
  const db = admin.firestore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameList: any[] = [];

  log('running deleteBadGameData');
  try {
    const querySnapshot = await db.collection('games').get();
    querySnapshot.docs.forEach((doc) => {
      const gameData = doc.data();
      gameList.push({ ...gameData, id: doc.id });
    });

    for (const gameData of gameList) {
      for (const stat of statsToValidate) {
        if (typeof gameData[stat] !== 'number') {
          log(`Deleting game ${gameData.id} for ${gameData.name} because ${stat} is not a number`);
          log(
            `Pts ${gameData.pts}, reb ${gameData.treb}, ast ${gameData.ast}, stl ${gameData.stl}, blk ${gameData.blk}, fgm ${gameData.fgm}, fga ${gameData.fga}, threepm ${gameData.threepm}, threepa ${gameData.threepa}`
          );
          await db.collection('games').doc(gameData.id).delete();
          break;
        }
      }
    }
  } catch (err) {
    error('Error in deleteBadGameData', err);
  }
};

export default {};

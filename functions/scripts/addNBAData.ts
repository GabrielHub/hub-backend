import admin from 'firebase-admin';
import NBA_PER_100 from '../mocks/nbaDataAdvanced';

interface Player {
  gp: number;
  [key: string]: any; // TODO Add other properties of player here
}

// * Takes NBA Per 100 data and adds it to database (2023 season)
const addNBAData = async (): Promise<void> => {
  const db = admin.firestore();

  // * Cut out anyone who played less than half a season
  const playersToAdd: Player[] = NBA_PER_100.filter((player: Player) => player?.gp > 40);

  const batch = db.batch();
  playersToAdd.forEach((player: Player) => {
    const playerRef = admin.firestore().collection('nba').doc();
    batch.set(playerRef, player);
  });

  await batch.commit().then((docRef) => {
    console.log('Document written with ID: ', docRef);
  });
};

export default addNBAData;
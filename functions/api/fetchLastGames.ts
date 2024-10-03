import { Response, Request } from 'express';
import admin from 'firebase-admin';
import { GameData } from '../types';

interface IGameData extends GameData {
  id: string;
}

// * Returns the last number of games for a player (ex. last 5 games played)
const fetchLastGame = async (req: Request, res: Response): Promise<void> => {
  const { playerID, numOfGames } = req.query;

  if (!playerID || typeof playerID !== 'string') {
    throw new Error('Invalid player passed');
  }

  let formattedNumOfGames: number;

  if (typeof numOfGames === 'string') {
    formattedNumOfGames = parseInt(numOfGames, 10);
  } else if (typeof numOfGames === 'number') {
    formattedNumOfGames = numOfGames;
  } else {
    formattedNumOfGames = NaN;
  }

  if (isNaN(formattedNumOfGames)) {
    // Handle invalid input
    throw new Error('Invalid number of games');
  }

  const db = admin.firestore();
  // * Fetch last number of games
  const lastGames: IGameData[] = [];

  await db
    .collection('games')
    .where('playerID', '==', playerID)
    .orderBy('_updatedAt', 'desc')
    .limit(formattedNumOfGames)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const gameData = doc.data() as GameData;
        lastGames.push({ ...gameData, id: doc.id });
      });
    })
    .catch((error) => {
      throw new Error(`Could not query firestore ${JSON.stringify(error)}`);
    });

  res.send(lastGames);
};

export default fetchLastGame;

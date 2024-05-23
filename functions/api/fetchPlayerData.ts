import admin from 'firebase-admin';
import { error } from 'firebase-functions/logger';
import { Response } from 'express';
import { PlayerData } from '../types';
import { getLeagueData } from '../utils';

// * For individual player pages
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchPlayerData = async (req: any, res: Response): Promise<Response<any>> => {
  const { playerID, position, lock } = req.query;

  if (!playerID || typeof playerID !== 'string') {
    return res.status(400).send('Invalid playerId parameter passed');
  }

  // * 0 is for all positions
  if (position && (position > 5 || position < 0)) {
    return res.status(400).send('Invalid position parameter passed');
  }

  if (lock && (typeof lock !== 'string' || lock !== '1')) {
    return res.status(400).send('Invalid lock parameter passed');
  }

  const db = admin.firestore();
  const playerData: PlayerData = await db
    .collection('players')
    .doc(playerID)
    .get()
    .then((doc) => {
      // * undefined if player does not exist
      return doc.data() as PlayerData;
    });

  if (!playerData?.gp) {
    error('No games played for this player');
    return res.status(404).send('No games played for this player');
  }

  let avgPlayerData: PlayerData = playerData;

  const leagueData = await getLeagueData();
  try {
    if (position && !lock) {
      // * Get averages from player sub collection positions, where the doc id is the position number
      const playerPositionData = await db
        .collection('players')
        .doc(playerID)
        .collection('positions')
        .doc(position)
        .get()
        .then((doc) => {
          if (!doc.exists) {
            throw new Error('No games found for this player position');
          }
          return doc.data() as PlayerData;
        });
      avgPlayerData = playerPositionData;
    }
  } catch (err) {
    error('No games found for this players position');
    return res.status(404).send('No games found for this player position');
  }

  try {
    if (lock) {
      const playerLockData = await db
        .collection('players')
        .doc(playerID)
        .collection('poaDefender')
        .doc('lock')
        .get()
        .then((doc) => {
          if (!doc.exists) {
            throw new Error('No games found for this players lock position');
          }
          return doc.data() as PlayerData;
        });

      if (playerLockData) {
        avgPlayerData = playerLockData;
      }
    }
  } catch (err) {
    error('No games found for this players lock position');
    return res.status(404).send('No games found for this players lock position');
  }

  const response = {
    playerData: avgPlayerData,
    leagueData
  };

  return res.send(response);
};

export default fetchPlayerData;

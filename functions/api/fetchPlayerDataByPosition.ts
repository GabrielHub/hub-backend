import admin from 'firebase-admin';
import { error } from 'firebase-functions/logger';
import { Response, Request } from 'express';
import { PlayerData } from '../types';

export const fetchPlayerDataByPosition = async (
  req: Request,
  res: Response
): Promise<Response<any>> => {
  const { playerID, position } = req.query;

  if (!playerID || typeof playerID !== 'string') {
    return res.status(400).send('Invalid playerId parameter passed');
  }

  if (!position || typeof position !== 'string') {
    return res.status(400).send('Invalid position parameter passed');
  }

  // * convert position to number, and make sure it is between 1 - 5
  const positionNumber = parseInt(position, 10);
  if (positionNumber < 1 || positionNumber > 5) {
    return res.status(400).send('Invalid position parameter passed');
  }

  const db = admin.firestore();
  let playerData: PlayerData | null = null;
  try {
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
    playerData = playerPositionData;
  } catch (err) {
    error('No games found for this players position');
    return res.status(404).send('No games found for this player position');
  }

  return res.status(200).send(playerData);
};

export default {};

import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { PlayerData } from '../types';

interface IRequestBody {
  position: string;
}

interface IRequest extends Request {
  body: IRequestBody;
}

interface IPlayerData extends PlayerData {
  id: string;
  rank: number;
}

// * Fetches players for table filtered by position, sorted by rating desc
const fetchForTableByPosition = async (req: IRequest, res: Response): Promise<void> => {
  const { position } = req.query;

  if (
    !position ||
    typeof position !== 'string' ||
    parseInt(position) < 1 ||
    parseInt(position) > 5
  ) {
    res.status(400).send('Invalid position parameter passed');
    return;
  }

  const db = admin.firestore();
  const playerData: IPlayerData[] = [];
  let rank = 1;

  try {
    const querySnapshot = await db
      .collectionGroup('positions')
      .where(admin.firestore.FieldPath.documentId(), '==', position)
      .orderBy('rating', 'desc')
      .get();

    // Process results
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data() as PlayerData;
      const playerId = doc.ref.parent.parent?.id;

      if (data.gp > 1 && playerId) {
        playerData.push({ ...data, id: playerId, rank: rank++ });
      }
    });

    res.send(playerData);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).send('Could not query firestore');
    return;
  }
};

export default fetchForTableByPosition;

import { Response, Request } from 'express';
import admin from 'firebase-admin';
import { GameData } from '../types';

const fetchRelatedGames = async (req: Request, res: Response): Promise<any> => {
  const { uploadId } = req.query;

  if (!uploadId || typeof uploadId !== 'string') {
    return res.status(400).send('Invalid uploadId');
  }

  const db = admin.firestore();
  try {
    const relatedGames = await db
      .collection('games')
      .where('uploadId', '==', uploadId)
      .get()
      .then((querySnapshot) => {
        const games: GameData[] = [];
        querySnapshot.forEach((doc) => {
          return games.push({ ...(doc.data() as GameData) });
        });
        return games;
      });

    return res.send(relatedGames);
  } catch (err) {
    return res.status(500).send(`Error fetching related games: ${err}`);
  }
};

export default fetchRelatedGames;

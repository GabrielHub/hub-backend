import { Response, Request } from 'express';
import admin from 'firebase-admin';

const fetchLastUploadedGame = async (req: Request, res: Response): Promise<void> => {
  const db = admin.firestore();
  const lastGames: any[] = [];

  await db
    .collection('games')
    .orderBy('_createdAt', 'desc')
    .limit(10)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        lastGames.push({ ...doc.data(), id: doc.id });
      });
    })
    .catch((error) => {
      throw new Error(`Could not query firestore ${JSON.stringify(error)}`);
    });

  res.status(200).send(lastGames);
};

export default fetchLastUploadedGame;

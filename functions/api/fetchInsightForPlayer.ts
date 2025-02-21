import admin from 'firebase-admin';
import { error } from 'firebase-functions/logger';
import { Response, Request } from 'express';

const fetchInsightForPlayer = async (req: Request, res: Response) => {
  const { playerId } = req.query;

  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).send('Invalid playerId parameter passed');
  }

  try {
    const db = admin.firestore();
    const insightSnapshot = await db
      .collection('insights')
      .where('playerId', '==', playerId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const insights = insightSnapshot.docs.map((doc) => doc.data());
    return res.status(200).json(insights);
  } catch (err) {
    error('Error fetching insights for player:', err);
    return res.status(500).send('Error fetching insights for player');
  }
};

export default fetchInsightForPlayer;

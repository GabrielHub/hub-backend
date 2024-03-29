import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { Award } from '../types';

// * Fetches players for table
const fetchAwards = async (req: Request, res: Response): Promise<void> => {
  const db = admin.firestore();
  let awardData: Award | null = null;

  // * Fetch data from firestore from the awards collection, sorted by the newest createdAt value

  const querySnapshot = await db.collection('awards').orderBy('createdAt', 'desc').limit(1).get();

  querySnapshot.forEach((doc) => {
    awardData = doc.data() as Award;
  });

  if (!awardData) {
    res.status(404).send('No awards found');
  } else {
    res.send(awardData);
  }
};

export default fetchAwards;

import admin from 'firebase-admin';
import NodeCache from 'node-cache';
import { Request, Response } from 'express';

const cache = new NodeCache({ stdTTL: 3599 });

interface ILeagueData {
  [key: string]: any; // replace any with the actual type
}

// * Fetches players for table
const fetchLeagueAverages = async (req: Request, res: Response): Promise<void> => {
  if (cache.has('leagueData')) {
    res.send(cache.get('leagueData'));
  } else {
    const db = admin.firestore();

    const league: ILeagueData = await db
      .collection('league')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
      .then((querySnapshot) => {
        // * should only be one because of limit
        const leagueData: ILeagueData[] = [];
        querySnapshot.forEach((doc) => {
          leagueData.push(doc.data());
        });
        return leagueData[0];
      });

    cache.set('leagueData', league);
    res.send(league);
  }
};

export default fetchLeagueAverages;
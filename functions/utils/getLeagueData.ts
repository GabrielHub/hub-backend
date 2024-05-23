import admin from 'firebase-admin';
import { LeagueData } from '../types';

export const getLeagueData = async (): Promise<LeagueData> => {
  const db = admin.firestore();
  const leagueData = await db
    .collection('league')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
    .then((querySnapshot) => {
      // * should only be one because of limit
      const league: LeagueData[] = [];
      querySnapshot.forEach((doc) => {
        league.push(doc.data() as LeagueData);
      });
      return league[0];
    });

  return leagueData;
};

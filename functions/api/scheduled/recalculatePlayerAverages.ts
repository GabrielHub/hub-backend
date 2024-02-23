import admin from 'firebase-admin';
import functions from 'firebase-functions';
import { MIN_GAMES } from '../../constants';
import { calculateAveragePlayerStats } from '../../utils';
import { GameData, LeagueData } from '../../types';

export const recalculatePlayerAverages = async (): Promise<void> => {
  const db = admin.firestore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerList: any[] = [];
  try {
    const querySnapshot = await db.collection('players').get();
    querySnapshot.docs.forEach((doc) => {
      const playerData = doc.data();
      if (playerData?.gp) {
        playerList.push({ ...playerData, id: doc.id });
      }
    });

    // * Get league data to recalculate PER based on league averages
    const leagueData = await db
      .collection('league')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
      .then((querySnapshot) => {
        const league: LeagueData[] = [];
        querySnapshot.forEach((doc) => {
          league.push(doc.data() as LeagueData);
        });
        return league[0];
      });

    for (const playerData of playerList) {
      const { name: storedName, alias, ftPerc, id } = playerData;
      // * collect all games by ALIAS includes NAME and use that for the calculate function
      // * There could theoretically be bad data, and an alias could be in multiple players. Avoid this by taking the first
      // TODO Error notifications/logs if there are more than one unique alias in someone's aliases?

      // * Only calculate averages once a player has min games played
      const gameDataRef = await db.collection('games').where('name', 'in', alias).get();
      if (gameDataRef.size >= MIN_GAMES) {
        const gameData = gameDataRef.docs.map((doc) => doc.data() as GameData);
        const avgPlayerStats = calculateAveragePlayerStats(
          leagueData,
          gameData,
          storedName,
          alias,
          ftPerc
        );

        // * Add number of aPER games played
        let aPERGames = 0;
        gameData.forEach(({ aPER }) => {
          if (aPER) {
            aPERGames += 1;
          }
        });

        avgPlayerStats.aPERGamesPlayed = aPERGames;

        await db
          .collection('players')
          .doc(id)
          .set({
            ...avgPlayerStats,
            _updatedAt: admin.firestore.Timestamp.now()
          });
      }
    }
  } catch (error) {
    functions.logger.error('Error running recalculatePlayerAverages', error);
  }
};

export default {};
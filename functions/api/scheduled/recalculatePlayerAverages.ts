import admin from 'firebase-admin';
import { error, log } from 'firebase-functions/logger';
import { WriteResult } from 'firebase-admin/firestore';
import { calculateAveragePlayerStats, getLeagueData, getPositions } from '../../utils';
import { GameData, PlayerData } from '../../types';
import { INITIAL_ELO } from '../../constants';

interface iPlayerData extends PlayerData {
  id: string;
}

export const recalculatePlayerAverages = async (): Promise<void> => {
  const db = admin.firestore();
  const playerList: iPlayerData[] = [];

  log('running recalculatePlayerAverages');

  try {
    const querySnapshot = await db.collection('players').get();
    querySnapshot.docs.forEach((doc) => {
      const playerData = doc.data() as PlayerData;
      playerList.push({ ...playerData, id: doc.id });
    });

    // * Get league data to recalculate PER based on league averages
    const leagueData = await getLeagueData();

    for (const playerData of playerList) {
      const { name: storedName, alias, id, rating: prevRating, gpSinceLastRating } = playerData;

      // * Skip AI games
      const gameDataRef = await db
        .collection('games')
        .where('playerID', '==', id)
        .where('isAI', '!=', 1)
        .get();
      const gameData = gameDataRef.docs.map((doc) => doc.data() as GameData);

      if (gameData.length) {
        const promises: Promise<WriteResult>[] = [];
        const avgPlayerStats = calculateAveragePlayerStats(
          leagueData,
          gameData,
          storedName,
          alias,
          prevRating,
          gpSinceLastRating
        );
        avgPlayerStats.positions = getPositions(gameData);
        avgPlayerStats.elo = playerData?.elo ?? INITIAL_ELO;

        // * For each position, calculate the average stats, then add to player sub-collection. the id of each subcollection is the position number
        Object.keys(avgPlayerStats.positions).forEach(async (pos) => {
          // * create a set of games by filtering game data by this position
          const posGameData = gameData.filter((game) => game.pos === parseInt(pos, 10));
          if (posGameData.length) {
            // * calculate the average stats for this position
            const posPlayerStats = calculateAveragePlayerStats(
              leagueData,
              posGameData,
              storedName,
              alias,
              prevRating,
              gpSinceLastRating
            );
            posPlayerStats.elo = playerData?.elo ?? INITIAL_ELO;
            posPlayerStats.position = parseInt(pos, 10);
            // * add the position to the player subcollection
            promises.push(
              db
                .collection('players')
                .doc(id)
                .collection('positions')
                .doc(pos)
                .set({
                  ...posPlayerStats,
                  _updatedAt: admin.firestore.Timestamp.now()
                })
            );
          }
        });

        // * Calculate the average stats for the player if they were the poaDefender (oppPos was 1)
        const poaDefenderGameData = gameData.filter((game) => game.oppPos === 1);
        if (poaDefenderGameData.length) {
          const poaDefenderStats = calculateAveragePlayerStats(
            leagueData,
            poaDefenderGameData,
            storedName,
            alias,
            prevRating,
            gpSinceLastRating
          );
          poaDefenderStats.elo = playerData?.elo ?? INITIAL_ELO;
          promises.push(
            db
              .collection('players')
              .doc(id)
              .collection('poaDefender')
              .doc('lock')
              .set({
                ...poaDefenderStats,
                _updatedAt: admin.firestore.Timestamp.now()
              })
          );
        }

        log('updating player', storedName, 'aliases', alias);
        promises.push(
          db
            .collection('players')
            .doc(id)
            .set({
              ...avgPlayerStats,
              _updatedAt: admin.firestore.Timestamp.now()
            })
        );

        await Promise.all(promises);
      }
    }
  } catch (err) {
    error('Error running recalculatePlayerAverages', err);
  }
};

export default {};

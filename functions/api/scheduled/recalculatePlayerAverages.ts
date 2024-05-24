import admin from 'firebase-admin';
import { error, log } from 'firebase-functions/logger';
import { WriteResult } from 'firebase-admin/firestore';
import { calculateAveragePlayerStats, getLeagueData, getPositions } from '../../utils';
import { Audit, GameData, PlayerData } from '../../types';
import { INITIAL_ELO } from '../../constants';
import { addAudit } from '../../utils/addAudit';
import { returnAuthToken } from '../../src/auth';
import req from '../../api/dashboardFunctions';

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
      const {
        name: storedName,
        alias,
        ftPerc,
        id,
        rating: prevRating,
        gpSinceLastRating
      } = playerData;

      // * collect all games by ALIAS includes NAME and use that for the calculate function
      // * There could theoretically be bad data, and an alias could be in multiple players. Avoid this by taking the first
      // TODO Error notifications/logs if there are more than one unique alias in someone's aliases?

      // * Skip AI games
      const gameDataRef = await db.collection('games').where('name', 'in', alias).get();
      const gameData = gameDataRef.docs
        .map((doc) => doc.data() as GameData)
        .filter((game) => game.isAI !== 1);

      if (gameData.length) {
        const promises: Promise<WriteResult>[] = [];
        const avgPlayerStats = calculateAveragePlayerStats(
          leagueData,
          gameData,
          storedName,
          alias,
          ftPerc,
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
              ftPerc,
              prevRating,
              gpSinceLastRating
            );
            posPlayerStats.elo = playerData?.elo ?? INITIAL_ELO;
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
            ftPerc,
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
    // add audit
    const uploadRef = db.collection('recalculatePlayerAverages').doc();
    const uploadId = uploadRef.id;
    const authToken = returnAuthToken(req);
    if (!authToken) {
      error('No admin found for audit responsible for recalculating player averages', uploadId);
    } else {
      const userInfo = await admin.auth().verifyIdToken(authToken);
      const auditData: Audit = {
        uploadId,
        admin: userInfo?.email || '',
        description: ' recalculated player averages'
      };
      await addAudit(auditData);
    }
  } catch (err) {
    error('Error running recalculatePlayerAverages', err);
  }
};

export default {};

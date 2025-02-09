import admin from 'firebase-admin';
import { log, error } from 'firebase-functions/logger';
import { calculateAveragePlayerStats, getLeagueData, getPositions } from '../../utils';
import { GameData, PlayerData } from '../../types';
import { INITIAL_ELO } from '../../constants';
import { WriteResult } from 'firebase-admin/firestore';
const GAME_TRIGGER_STATUS_ENUMS = {
  IN_PROGRESS: 'in-progress',
  SUCCESS: 'success',
  FAIL: 'failed'
};

// * Update players when games are added
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const upsertPlayerData = async (snapshot: any) => {
  const data: GameData = snapshot.after.data();
  const { name, gameTrigger, playerID } = data;
  log('upsertPlayerData', name, gameTrigger);
  const gameRef = snapshot.after.ref;

  const db = admin.firestore();
  try {
    if (
      gameTrigger?.status === GAME_TRIGGER_STATUS_ENUMS.IN_PROGRESS ||
      gameTrigger?.status === GAME_TRIGGER_STATUS_ENUMS.SUCCESS ||
      gameTrigger?.status === GAME_TRIGGER_STATUS_ENUMS.FAIL
    ) {
      log('Skipping game trigger.', `status is ${gameTrigger?.status ?? 'undefined'}`);
      return;
    }

    gameRef.update({
      gameTrigger: {
        status: GAME_TRIGGER_STATUS_ENUMS.IN_PROGRESS,
        date: admin.firestore.Timestamp.now()
      }
    });

    const playerQuerySnapshot = await db.collection('players').doc(playerID).get();
    if (!playerQuerySnapshot.exists) {
      error('Player does not exist', playerID, name);
      return;
    }

    // * Get league data to recalculate PER based on league averages
    const leagueData = await getLeagueData();

    // * Query for all game data and overwrite player data to fix data errors and essentially resync data
    const playerData = playerQuerySnapshot.data() as PlayerData;

    const { name: storedName, alias, rating: prevRating, gpSinceLastRating } = playerData;

    // * Only calculate averages once a player has min games played
    const gameDataRef = await db
      .collection('games')
      .where('playerID', '==', playerID)
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
              .doc(playerID)
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
            .doc(playerID)
            .collection('poaDefender')
            .doc('lock')
            .set({
              ...poaDefenderStats,
              _updatedAt: admin.firestore.Timestamp.now()
            })
        );
      }
      // * Add the player to the player collection
      promises.push(
        db
          .collection('players')
          .doc(playerID)
          .set({
            ...avgPlayerStats,
            _updatedAt: admin.firestore.Timestamp.now()
          })
      );

      log('updating player from game trigger', storedName, 'aliases', alias);
      await Promise.all(promises);
    } else {
      log('No game data found for player', playerID, storedName, 'aliases', alias);
    }

    gameRef.update({
      gameTrigger: {
        status: GAME_TRIGGER_STATUS_ENUMS.SUCCESS,
        date: admin.firestore.Timestamp.now()
      }
    });
  } catch (err) {
    error('Error in game trigger', err);
    gameRef.update({
      gameTrigger: {
        status: GAME_TRIGGER_STATUS_ENUMS.FAIL,
        date: admin.firestore.Timestamp.now()
      }
    });
  }
};

export default {};

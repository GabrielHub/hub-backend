import admin from 'firebase-admin';
import { log, error } from 'firebase-functions/logger';
import { calculateAveragePlayerStats, getPositions } from '../../utils';
import { GameData, LeagueData, PlayerData } from '../../types';
import { DEFAULT_FT_PERC } from '../../constants';
import { WriteResult } from 'firebase-admin/firestore';

const GAME_TRIGGER_STATUS_ENUMS = {
  IN_PROGRESS: 'in-progress',
  SUCCESS: 'success',
  FAIL: 'failed'
};

// * Update players when games are added
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const upsertPlayerData = async (snapshot: any) => {
  const data = snapshot.after.data();
  const { name, gameTrigger } = data;
  log('upsertPlayerData', name, gameTrigger);
  const gameRef = snapshot.after.ref;

  const db = admin.firestore();
  try {
    if (
      gameTrigger?.status === GAME_TRIGGER_STATUS_ENUMS.IN_PROGRESS ||
      gameTrigger?.status === GAME_TRIGGER_STATUS_ENUMS.SUCCESS ||
      gameTrigger?.status === GAME_TRIGGER_STATUS_ENUMS.FAIL
    ) {
      log('Skipping sendMail trigger.', `status is ${gameTrigger?.status ?? 'undefined'}`);
      return;
    }

    gameRef.update({
      gameTrigger: {
        status: GAME_TRIGGER_STATUS_ENUMS.IN_PROGRESS,
        date: admin.firestore.Timestamp.now()
      }
    });

    const playerQuerySnapshot = await db
      .collection('players')
      .where('alias', 'array-contains', name)
      .get();

    // * Query for all game data and overwrite player data to fix data errors and essentially resync data
    if (playerQuerySnapshot.empty) {
      // * If player does not exist, create it.
      // * Create a lowercase alias for the player. Remove duplicates
      const alias = Array.from(new Set([name, name.toLowerCase()]));
      await db.collection('players').add({
        name,
        alias,
        ftPerc: DEFAULT_FT_PERC,
        rating: 0,
        ratingMovement: '',
        ratingString: '',
        gpSinceLastRating: 0,
        _createdAt: admin.firestore.Timestamp.now(),
        _updatedAt: admin.firestore.Timestamp.now()
      });
    } else {
      // * Get league data to recalculate PER based on league averages
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

      // * collect all games by ALIAS includes NAME and use that for the calculate function
      // * There could theoretically be bad data, and an alias could be in multiple players. Avoid this by taking the first
      // TODO Error notifications/logs if there are more than one unique alias in someone's aliases?
      const playerData = playerQuerySnapshot.docs.map((doc) => {
        return { ...(doc.data() as PlayerData), id: doc.id };
      })[0];

      const {
        name: storedName,
        alias,
        ftPerc,
        id,
        rating: prevRating,
        gpSinceLastRating
      } = playerData;

      // * Only calculate averages once a player has min games played
      const gameDataRef = await db.collection('games').where('name', 'in', alias).get();
      // * Filter by non-AI games
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
        // * Add the player to the player collection
        promises.push(
          db
            .collection('players')
            .doc(id)
            .set({
              ...avgPlayerStats,
              _createdAt: admin.firestore.Timestamp.now(),
              _updatedAt: admin.firestore.Timestamp.now()
            })
        );

        log('creating/updating player from game trigger', storedName, 'aliases', alias);
        await Promise.all(promises);
      }
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

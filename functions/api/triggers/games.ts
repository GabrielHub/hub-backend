import admin from 'firebase-admin';
import functions from 'firebase-functions';
import calculateAveragePlayerStats from '../../utils/calculateAveragePlayerStats';
import { GameData, LeagueData, PlayerData } from '../../types';

const GAME_TRIGGER_STATUS_ENUMS = {
  IN_PROGRESS: 'in-progress',
  SUCCESS: 'success',
  FAIL: 'failed'
};

// * Update players when games are added
const upsertPlayerData = async (snapshot: any) => {
  const data = snapshot.after.data();
  const { name, gameTrigger } = data;
  const gameRef = snapshot.after.ref;

  const db = admin.firestore();
  try {
    if (
      gameTrigger?.status === GAME_TRIGGER_STATUS_ENUMS.IN_PROGRESS ||
      gameTrigger?.status === GAME_TRIGGER_STATUS_ENUMS.SUCCESS ||
      gameTrigger?.status === GAME_TRIGGER_STATUS_ENUMS.FAIL
    ) {
      functions.logger.info('Skipping sendMail trigger.', `status is ${gameTrigger.status}`);
      return;
    }

    gameRef.update({
      gameTrigger: {
        status: GAME_TRIGGER_STATUS_ENUMS.IN_PROGRESS,
        date: admin.firestore.Timestamp.now()
      }
    });

    // * If player does not exist, create it.
    const playerQuerySnapshot = await db
      .collection('players')
      .where('alias', 'array-contains', name)
      .get();

    // * Query for all game data and overwrite player data to fix data errors and essentially resync data
    if (playerQuerySnapshot.empty) {
      await db.collection('players').add({
        name,
        alias: [name],
        ftPerc: 70,
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

      const { name: storedName, alias, ftPerc, id } = playerData;

      // * Only calculate averages once a player has at least 5 games
      const gameDataRef = await db.collection('games').where('name', 'in', alias).get();
      if (gameDataRef.size >= 5) {
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
            _createdAt: admin.firestore.Timestamp.now(),
            _updatedAt: admin.firestore.Timestamp.now()
          });
      }
    }

    gameRef.update({
      gameTrigger: {
        status: GAME_TRIGGER_STATUS_ENUMS.SUCCESS,
        date: admin.firestore.Timestamp.now()
      }
    });
  } catch (error) {
    functions.logger.error('Error in game trigger', error);
    gameRef.update({
      gameTrigger: {
        status: GAME_TRIGGER_STATUS_ENUMS.FAIL,
        date: admin.firestore.Timestamp.now()
      }
    });
  }
};

export default upsertPlayerData;

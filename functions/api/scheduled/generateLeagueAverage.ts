import admin from 'firebase-admin';
import { log, error } from 'firebase-functions/logger';
import dayjs from 'dayjs';
import { PlayerData } from '../../types';
import { round } from 'lodash';

const STATS_TO_ADD = [
  'pts',
  'treb',
  'dreb',
  'oreb',
  'ast',
  'stl',
  'blk',
  'tov',
  'pf',
  'ortg',
  'drtg',
  'fga',
  'fgm',
  'threepa',
  'threepm',
  'threepAR',
  'fta',
  'ftm',
  'pace',
  'gameScore',
  'usageRate'
];

/**
 * @description finds amount to divide by for stats that aren't valid across all players (APER and PACE)
 * @param {*} playerList
 * @param {*} stat
 * @return {number}
 */
const getMissingStatAmount = (playerList: PlayerData[], stat: string): number => {
  return playerList.reduce((count, player) => {
    if (player?.[stat]) {
      return count + 1;
    }
    return count;
  }, 0);
};

const generateLeagueAverage = async (): Promise<null> => {
  const db = admin.firestore();

  log('running generateLeagueAverage');
  // * Missing Data, data that may not be there for all players
  const MISSING_DATA = ['pace', 'aPER'];

  try {
    const querySnapshot = await db.collection('players').get();

    const playerList: PlayerData[] = [];
    querySnapshot.docs.forEach((doc) => {
      const playerData = doc.data();
      // * Players only have averages past 5 games, make sure data exists first
      if (playerData?.gp) {
        playerList.push(playerData as PlayerData);
      }
    });

    // * Initialize averages with 0 for each stat
    const averageGameStats = {
      PER: 15,
      aPER: 0
    };
    STATS_TO_ADD.forEach((stat) => {
      averageGameStats[stat] = 0;
    });

    // * Average stats per game played for each player
    playerList.forEach((playerData) => {
      STATS_TO_ADD.forEach((stat) => {
        if (playerData[stat]) {
          averageGameStats[stat] += playerData[stat];
        }
      });
    });
    Object.keys(averageGameStats).forEach((stat) => {
      // * For now hardcode this missing stat (pace)
      if (MISSING_DATA.includes(stat)) {
        const paceLength = getMissingStatAmount(playerList, stat);
        averageGameStats[stat] = round(averageGameStats[stat] / paceLength, 1);
      } else {
        averageGameStats[stat] = round(averageGameStats[stat] / playerList.length, 1);
      }
    });

    // * Average aPER should be done on a per game basis (not per player) to account for minutes played
    let sumOfAPER = 0;
    let gamesWithAPER = 0;
    playerList.forEach(({ aPER, aPERGamesPlayed }) => {
      if (aPER && aPERGamesPlayed) {
        sumOfAPER += aPER * aPERGamesPlayed;
        gamesWithAPER += aPERGamesPlayed;
      }
    });
    const aPER = sumOfAPER / gamesWithAPER;
    averageGameStats.aPER = aPER;
    /** Set league average PER to 15 as per Hollinger https://www.basketball-reference.com/about/per.html  */
    averageGameStats.PER = 15;

    await db.collection('league').add({
      ...averageGameStats,
      players: playerList.length,
      // * Store each league average as historical data
      createdAt: dayjs().format('YYYY-MM-DD')
    });

    log('league average updated', averageGameStats);

    return null;
  } catch (err) {
    error('Error running generateLeagueAverage', err);
    return null;
  }
};

export default generateLeagueAverage;

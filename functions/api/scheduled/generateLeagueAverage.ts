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
  'usageRate',
  'tovPerc',
  'gp',
  'aPER'
];

const generateLeagueAverage = async (): Promise<null> => {
  const db = admin.firestore();

  log('running generateLeagueAverage');

  try {
    const querySnapshot = await db.collection('players').get();

    const playerList: PlayerData[] = [];
    querySnapshot.docs.forEach((doc) => {
      const playerData = doc.data();
      // * Don't count a player until they've played at least 2 valid games
      if (playerData?.gp && playerData?.gp > 1) {
        playerList.push(playerData as PlayerData);
      }
    });

    // * Initialize averages with 0 for each stat
    const averageGameStats = {
      PER: 15
    };
    STATS_TO_ADD.forEach((stat) => {
      averageGameStats[stat] = 0;
    });

    // Initialize a separate count for each stat
    const gamesPlayedCounts = {};
    STATS_TO_ADD.forEach((stat) => {
      gamesPlayedCounts[stat] = 0;
    });

    // Initialize total games played
    let totalGamesPlayed = 0;

    // Average stats per game played for each player
    playerList.forEach((playerData) => {
      const gp = playerData?.['gp'];
      if (gp && Number.isFinite(gp)) {
        totalGamesPlayed += gp;
        STATS_TO_ADD.forEach((stat) => {
          if (playerData[stat] && Number.isFinite(playerData[stat])) {
            averageGameStats[stat] += playerData[stat] / gp;
            gamesPlayedCounts[stat] += gp;
          }
        });
      }
    });

    // Calculate averages
    Object.keys(averageGameStats).forEach((stat) => {
      averageGameStats[stat] = round(averageGameStats[stat] / gamesPlayedCounts[stat], 1);
    });

    // Add calculations for FG%, 3PT%, and EFG%
    averageGameStats['fgPerc'] = averageGameStats['fgm'] / averageGameStats['fga'];
    averageGameStats['threepPerc'] = averageGameStats['threepm'] / averageGameStats['threepa'];
    averageGameStats['efgPerc'] =
      (averageGameStats['fgm'] + 0.5 * averageGameStats['threepm']) / averageGameStats['fga'];

    // Add calculations for AST/TO ratio
    averageGameStats['astToRatio'] = averageGameStats['ast'] / averageGameStats['tov'];

    // Add total games played to the league averages
    averageGameStats['totalGamesPlayed'] = totalGamesPlayed;

    // * Average PER is always 15
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

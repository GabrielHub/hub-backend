import admin from 'firebase-admin';
import { log, error } from 'firebase-functions/logger';
import dayjs from 'dayjs';
import { PlayerData } from '../../types';

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
  'aPER',
  'astPerc',
  'oFGA',
  'oFGM',
  'o3PA',
  'o3PM',
  'eBPM',
  'bpm'
];

const generateLeagueAverage = async (): Promise<null> => {
  const db = admin.firestore();

  log('running generateLeagueAverage');

  try {
    const querySnapshot = await db.collection('players').get();

    const playerList: PlayerData[] = [];
    querySnapshot.docs.forEach((doc) => {
      const playerData = doc.data();
      if (playerData?.gp) {
        playerList.push(playerData as PlayerData);
      }
    });

    // * Initialize averages with 0 for each stat
    const averageGameStats = {
      PER: 15,
      totalStats: {
        gp: 0
      }
    };
    // Initialize totals for each stat
    const totalStats = {
      gp: 0
    };
    STATS_TO_ADD.forEach((stat) => {
      averageGameStats[stat] = 0;
      totalStats[stat] = 0;
    });

    let totalGamesPlayed = 0;

    // Initialize a separate count for each stat
    const gamesPlayedCounts = {};
    STATS_TO_ADD.forEach((stat) => {
      gamesPlayedCounts[stat] = 0;
    });

    // Average stats per game played for each player
    playerList.forEach((playerData) => {
      const gp = playerData?.['gp'];
      if (gp && Number.isFinite(gp)) {
        totalGamesPlayed += gp;
        STATS_TO_ADD.forEach((stat) => {
          if (typeof playerData[stat] === 'number' && Number.isFinite(playerData[stat])) {
            averageGameStats[stat] += playerData[stat];
            gamesPlayedCounts[stat] += 1;
            totalStats[stat] += playerData[stat] * gp;
          }
        });
      }
    });

    // Calculate averages
    Object.keys(averageGameStats).forEach((stat) => {
      averageGameStats[stat] =
        gamesPlayedCounts[stat] !== 0 ? averageGameStats[stat] / gamesPlayedCounts[stat] : 0;
    });

    // Add calculations for FG%, 3PT%, and EFG%
    averageGameStats['fgPerc'] = (averageGameStats['fgm'] / averageGameStats['fga']) * 100;
    averageGameStats['threepPerc'] =
      (averageGameStats['threepm'] / averageGameStats['threepa']) * 100;
    averageGameStats['efgPerc'] =
      ((averageGameStats['fgm'] + 0.5 * averageGameStats['threepm']) / averageGameStats['fga']) *
      100;

    // Add calculations for AST/TO ratio
    averageGameStats['astToRatio'] = averageGameStats['ast'] / averageGameStats['tov'];

    averageGameStats.totalStats = totalStats;
    averageGameStats.totalStats.gp = totalGamesPlayed;

    // * Average PER is always 15
    averageGameStats.PER = 15;

    await db.collection('league').add({
      ...averageGameStats,
      players: playerList.length,
      // * Store each league average as historical data
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
    });

    log('league average updated', averageGameStats);

    return null;
  } catch (err) {
    error('Error running generateLeagueAverage', err);
    return null;
  }
};

export default generateLeagueAverage;

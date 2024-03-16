import admin from 'firebase-admin';
import { error } from 'firebase-functions/logger';
import { Response } from 'express';
import { GameData, LeagueData, PlayerData } from '../types';
import { calculateAveragePlayerStats } from '../utils';

// * For individual player pages
const fetchPlayerData = async (req: any, res: Response): Promise<void> => {
  const { playerID, position } = req.query;

  if (!playerID || typeof playerID !== 'string') {
    res.status(400).send('Invalid playerId parameter passed');
    throw new Error('Invalid playerId parameter passed');
  }

  if (position && (position > 5 || position < 1)) {
    res.status(400).send('Invalid position parameter passed');
    throw new Error('Invalid position parameter passed');
  }

  const db = admin.firestore();
  const playerData: PlayerData = await db
    .collection('players')
    .doc(playerID)
    .get()
    .then((doc) => {
      // * undefined if player does not exist
      return doc.data() as PlayerData;
    });

  if (!playerData?.gp) {
    error('No games played for this player');
    res.status(404).send('No games played for this player');
    return;
  }

  let avgPlayerData: PlayerData = playerData;

  // * Get league data to recalculate PER based on league averages, plus use for comparison analysis
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

  // * Recalculate player averages based on position
  if (position) {
    const gameDataRef = await db.collection('games').where('name', 'in', playerData.alias).get();
    const gameData = gameDataRef.docs
      .map((doc) => doc.data() as GameData)
      .filter((game) => game.isAI !== 1 && game.pos === position);

    if (gameData.length) {
      const avgPlayerStats = calculateAveragePlayerStats(
        leagueData,
        gameData,
        playerData.name,
        playerData.alias,
        playerData.ftPerc,
        playerData.rating,
        playerData.gpSinceLastRating
      );

      avgPlayerData = avgPlayerStats;
    } else {
      error('No games found for this player');
      res.status(404).send('No games found for this player');
      return;
    }
  }

  const response = {
    playerData: avgPlayerData,
    leagueData
  };

  res.send(response);
};

export default fetchPlayerData;

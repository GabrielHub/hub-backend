import { Request, Response } from 'express';
import { log, error } from 'firebase-functions/logger';
import admin from 'firebase-admin';
import { INITIAL_ELO } from '../constants';
import { Audit, PlayerData, RawPlayerData } from '../types';
import { calculateGameScore, calculateNewElo } from '../utils/elo';
import { returnAuthToken } from '../src/auth';
import { addAudit } from '../utils/addAudit';

/*
 * @description Generate Elo ratings for all players in the database
 * @description Elo is performance over win, so each player is compared to all other players in a game
 */
export const generateElo = async (req: Request, res: Response) => {
  log('Generating Elo ratings');

  const { reason } = req.query;

  const db = admin.firestore();
  try {
    const playerSnapshot = await db.collection('players').get();
    // * Maps player ID to player Elo
    const playerEloMap = new Map<string, number>();
    // * Maps player alias to player ID
    const playerAliasMap = new Map<string, string>();
    playerSnapshot.forEach((doc) => {
      const playerData = doc.data() as PlayerData;
      playerEloMap.set(doc.id, INITIAL_ELO);
      playerData.alias.forEach((alias) => {
        playerAliasMap.set(alias, doc.id);
      });
    });

    const gameSnapshot = await db.collection('uploads').get();
    gameSnapshot.forEach((doc) => {
      const data = doc.data();
      // * Data error where some games have rawPlayerData and some have playerData
      const boxScoreData = (data?.rawPlayerData || data?.playerData) as RawPlayerData[];
      const tData = data?.rawTeamData || data?.teamData;

      const teamPoints = {
        1: tData[1].pts,
        2: tData[2].pts
      };
      const teamEloRatings = {
        1: 0,
        2: 0
      };

      boxScoreData.forEach((player) => {
        const playerUID = playerAliasMap.get(player.name.toLowerCase());
        if (!playerUID) {
          error('Player not found in list of players', player.name);
          return;
        }
        player.eloComparisonValue = calculateGameScore(player) + teamPoints[player.team];
        player.uid = playerUID;
        teamEloRatings[player.team] += player.eloComparisonValue;
      });

      boxScoreData.forEach((player) => {
        if (player.isAI || !player.eloComparisonValue || !player.uid) {
          return;
        }
        const currentElo = playerEloMap.get(player.uid);
        if (!currentElo) {
          error('Player not found in list of players', player.name);
          return;
        }
        const opponents = boxScoreData.filter(
          (opponent) => !opponent.isAI && opponent.uid !== player.uid
        );
        const newElo = calculateNewElo(
          currentElo,
          playerEloMap,
          teamPoints,
          teamEloRatings,
          player,
          opponents
        );
        playerEloMap.set(player.uid, newElo);
      });
    });

    const batch = db.batch();
    playerEloMap.forEach((elo, uid) => {
      const playerRef = db.collection('players').doc(uid);
      batch.update(playerRef, { elo });
    });

    if (reason && typeof reason === 'string') {
      const authToken = returnAuthToken(req);
      if (!authToken) {
        error('No admin found for audit generating elo');
      } else {
        const userInfo = await admin.auth().verifyIdToken(authToken);
        const auditData: Audit = {
          admin: userInfo?.email || '',
          description: ' generated ELO',
          reason
        };
        await addAudit(auditData);
      }
    }

    await batch.commit();
    return res.status(200).send('Elo ratings generated');
  } catch (err) {
    error(err);
    return res.status(500).send('Internal Server Error');
  }
};

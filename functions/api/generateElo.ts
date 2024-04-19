import { Request, Response } from 'express';
import { log, error } from 'firebase-functions/logger';
import admin from 'firebase-admin';
import { INITIAL_ELO } from '../constants';
import { PlayerData } from '../types';

interface RawPlayerData {
  ast: number;
  blk: number;
  fga: number;
  fgm: number;
  grd: string;
  id: string;
  isAI: number;
  name: string;
  oppPos: number;
  pf: number;
  pts: number;
  stl: number;
  team: number;
  threepa: number;
  threepm: number;
  tov: number;
  treb: number;
  pos: number;
  /** Team Score + Game Score */
  eloComparisonValue?: number;
  /** id to match in PlayerEloMap */
  uid?: string;
}

const K = 20;
const C = 400;

const expectedResult = (ratingA: number, ratingB: number): number => {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / C));
};

const calculateGameScore = (player: RawPlayerData): number => {
  const gameScore =
    player.pts +
    0.4 * player.fgm -
    0.7 * player.fga -
    0.5 * player.treb +
    player.stl +
    0.7 * player.ast +
    0.7 * player.blk -
    0.4 * player.pf -
    player.tov;

  return gameScore;
};

const actualResult = (playerA: number, playerB: number): number => {
  if (playerA > playerB) {
    return 1;
  }
  if (playerA < playerB) {
    return 0;
  }
  return 0.5;
};

const qValue = (elow: number, elol: number): number => {
  return 2.2 / ((elow - elol) * 0.001 + 2.2);
};

const marginOfVictory = (
  teamPoints: { 1: number; 2: number },
  teamRatings: { 1: number; 2: number },
  playerAPts: number,
  playerBPts: number
): number => {
  const winningTeam = teamPoints[1] > teamPoints[2] ? 1 : 2;
  const losingTeam = winningTeam === 1 ? 2 : 1;
  return (
    Math.log(Math.abs(playerAPts - playerBPts) + 1) *
    qValue(teamRatings[winningTeam], teamRatings[losingTeam])
  );
};

const calculateNewElo = (
  currentRating: number,
  playerMap: Map<string, number>,
  teamPoints: { 1: number; 2: number },
  teamRatings: { 1: number; 2: number },
  playerData: RawPlayerData,
  opponents: RawPlayerData[]
): number => {
  if (!playerData.eloComparisonValue || !playerData.uid) return currentRating;

  const sumOfComparisons = opponents.reduce((acc, opponent) => {
    if (!opponent.eloComparisonValue || !opponent.uid || !playerData.eloComparisonValue) {
      return acc;
    }
    const opponentRating = playerMap.get(opponent.uid) || INITIAL_ELO;
    const expected = expectedResult(currentRating, opponentRating);
    const movm = marginOfVictory(
      teamPoints,
      teamRatings,
      playerData.eloComparisonValue,
      opponent.eloComparisonValue
    );
    const actual = actualResult(playerData.eloComparisonValue, opponent.eloComparisonValue);
    return acc + K * (actual - expected) * movm;
  }, 0);
  return currentRating + sumOfComparisons;
};

/*
 * @description Generate Elo ratings for all players in the database
 * @description Elo is performance over win, so each player is compared to all other players in a game
 */
export const generateElo = async (req: Request, res: Response) => {
  log('Generating Elo ratings');
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
    await batch.commit();
    return res.status(200).send('Elo ratings generated');
  } catch (err) {
    error(err);
    return res.status(500).send('Internal Server Error');
  }
};

import admin from 'firebase-admin';
import functions from 'firebase-functions';
import nba from 'nba-api-client';
import dayjs from 'dayjs';
import { Request, Response } from 'express';
import { findSimilarPlayers } from '../utils';
import { TotalNBAData, PlayerData, SimilarPlayer } from '../types';
import { PER_GAME, expectedPerGameFormats } from '../constants';

const basicErrorHandler = (res: Response, message: string): void => {
  functions?.logger.error(message);
  res.status(400).send(message);
  throw new Error(message);
};

/**
 * @description Looks up player stats and returns the 3 closest NBA Players from 2023
 * @param {Request} req
 * @param {Response} res
 */
const compareToNBA = async (req: Request, res: Response): Promise<void> => {
  const { playerID, season, perGame: perGameReq, paceAdjust, limit } = req.query;

  if (!playerID || typeof playerID !== 'string') {
    basicErrorHandler(res, 'Invalid playerID passed');
    return;
  }

  if (!season || typeof season !== 'string') {
    basicErrorHandler(res, 'Invalid season passed');
  } else {
    if (!dayjs(season, 'YYYY-YY').isValid()) {
      basicErrorHandler(res, 'Invalid season format');
    }

    const [startYear, endYear] = season.split('-');
    if (parseInt(endYear) > dayjs().year()) {
      basicErrorHandler(res, `Invalid season year ${startYear}-${endYear}`);
    }
  }

  let perGame = PER_GAME;
  // check if perGame is matches one of the expected formats. If not default to PER_GAME
  if (perGameReq && typeof perGameReq === 'string' && expectedPerGameFormats.includes(perGameReq)) {
    perGame = perGameReq;
  }

  const db = admin.firestore();
  const playerData = (await db
    .collection('players')
    .doc(playerID)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return doc.data();
      }
      basicErrorHandler(res, 'Player not found');
      return;
    })) as PlayerData;

  let similarPlayers: SimilarPlayer[] = [];

  try {
    const response = await nba.leaguePlayerGeneralStats({
      Season: season,
      PerMode: perGame,
      PaceAdjust: paceAdjust ? 'Y' : 'N'
    });
    const nbaData: TotalNBAData = response.LeagueDashPlayerStats;

    const maxPlayers = limit ? parseInt(limit as string, 10) : 3;

    similarPlayers = findSimilarPlayers(playerData, nbaData, perGame, maxPlayers);
  } catch (error) {
    functions?.logger.error('Error fetching NBA data', error);
    res.status(500).send('Error fetching NBA data');
  }

  res.status(200).send(similarPlayers);
};

export default compareToNBA;

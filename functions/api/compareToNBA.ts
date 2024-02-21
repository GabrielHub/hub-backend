import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import findSimilarPlayers from '../utils/findSimilarPlayers';
import { PlayerData } from '../types';

/**
 * @description Looks up player stats and returns the 3 closest NBA Players from 2023
 * @param {Request} req
 * @param {Response} res
 */
const compareToNBA = async (req: Request, res: Response): Promise<void> => {
  const { playerID } = req.query;

  if (!playerID || typeof playerID !== 'string') {
    throw new Error('Invalid player passed');
  }

  const db = admin.firestore();
  const playerData = await db
    .collection('players')
    .doc(playerID)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return doc.data();
      }
      throw new Error('Player does not exist');
    }) as PlayerData;

  if (!playerData) {
    throw new Error('Player data does not exist');
  }

  const nbaData: any[] = [];
  await db
    .collection('nba')
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        nbaData.push(doc.data());
      });
    });

  const similarPlayers = findSimilarPlayers(playerData, nbaData);

  res.send(similarPlayers);
};

export default compareToNBA;

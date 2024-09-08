import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { PlayerData } from '../types';

interface IRequestBody {
  sortField: string;
  sortType: 'asc' | 'desc';
  limit?: number;
}

interface IRequest extends Request {
  body: IRequestBody;
}

interface IPlayerData extends PlayerData {
  id: string;
  rank: number;
}

// * Fetches players for table
const fetchForTable = async (req: IRequest, res: Response): Promise<void> => {
  const { sortField, sortType, limit } = req.body;

  const db = admin.firestore();
  const playerData: IPlayerData[] = [];
  let rank = 1;

  try {
    const querySnapshot = await db
      .collection('players')
      .orderBy(sortField, sortType)
      .limit(limit ?? 10)
      .get();

    querySnapshot.forEach((doc) => {
      const data = doc.data() as PlayerData;
      if (data.gp > 1) {
        playerData.push({ ...data, id: doc.id, rank });
        rank += 1;
      }
    });
  } catch (error) {
    throw new Error('Could not query firestore');
  }

  res.send(playerData);
};

export default fetchForTable;

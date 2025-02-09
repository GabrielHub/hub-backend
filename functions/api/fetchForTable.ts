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
    let query = db.collection('players').orderBy(sortField, sortType);

    if (limit) {
      query = query.limit(limit);
    }

    const querySnapshot = await query.get();

    querySnapshot.forEach((doc) => {
      const data = doc.data() as PlayerData;
      if (data.gp > 1) {
        playerData.push({ ...data, id: doc.id, rank });
        rank += 1;
      }
    });
  } catch (error) {
    console.error('Query error:', error);
    throw new Error('Could not query firestore');
  }

  res.send(playerData);
};

export default fetchForTable;

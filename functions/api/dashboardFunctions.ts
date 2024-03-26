import { Request, Response } from 'express';
import { error } from 'firebase-functions/logger';
import { recalculatePlayerAverages } from './scheduled/recalculatePlayerAverages';
import generateLeagueAverage from './scheduled/generateLeagueAverage';

export const recalculatePlayerAverageAPI = async (req: Request, res: Response) => {
  try {
    await recalculatePlayerAverages();
    return res.status(200).send('Recalculated player averages');
  } catch (err) {
    error('Error recalculating player averages', err);
    return res.status(500).send('Error recalculating player averages');
  }
};

export const generateLeagueAverageAPI = async (req: Request, res: Response) => {
  try {
    await generateLeagueAverage();
    return res.status(200).send('Generated league average');
  } catch (err) {
    error('Error generating league average', err);
    return res.status(500).send('Error generating league average');
  }
};

export default { recalculatePlayerAverageAPI, generateLeagueAverageAPI };

import { Request, Response } from 'express';
import { error } from 'firebase-functions/logger';
import { recalculatePlayerAverages } from './scheduled/recalculatePlayerAverages';
import generateLeagueAverage from './scheduled/generateLeagueAverage';
import { returnAuthToken } from '../src/auth';
import { Audit } from '../types/audits';
import { addAudit } from '../utils/addAudit';
import admin from 'firebase-admin';

export const recalculatePlayerAverageAPI = async (req: Request, res: Response) => {
  try {
    await recalculatePlayerAverages();
    const authToken = returnAuthToken(req);
    if (!authToken) {
      error('No admin found for audit responsible for recalculating player averages');
    } else {
      const userInfo = await admin.auth().verifyIdToken(authToken);
      const auditData: Audit = {
        admin: userInfo?.email || '',
        description: ' recalculated player averages'
      };
      await addAudit(auditData);
    }
    return res.status(200).send('Recalculated player averages');
  } catch (err) {
    error('Error recalculating player averages', err);
    return res.status(500).send('Error recalculating player averages');
  }
};

export const generateLeagueAverageAPI = async (req: Request, res: Response) => {
  try {
    await generateLeagueAverage();
    const authToken = returnAuthToken(req);
    if (!authToken) {
      error('No admin found for audit responsible for generating league averages');
    } else {
      const userInfo = await admin.auth().verifyIdToken(authToken);
      const auditData = {
        admin: userInfo?.email || '',
        description: ' generated league average'
      };
      await addAudit(auditData);
    }
    return res.status(200).send('Generated league average');
  } catch (err) {
    error('Error generating league average', err);
    return res.status(500).send('Error generating league average');
  }
};

export default { recalculatePlayerAverageAPI, generateLeagueAverageAPI };

import admin from 'firebase-admin';
import { Request, Response } from 'express';
import { error } from 'firebase-functions/logger';
import { recalculatePlayerAverages } from './scheduled/recalculatePlayerAverages';
import generateLeagueAverage from './scheduled/generateLeagueAverage';
import { returnAuthToken } from '../src/auth';
import { Audit } from '../types';
import { addAudit } from '../utils/addAudit';

export const recalculatePlayerAverageAPI = async (req: Request, res: Response) => {
  const { reason } = req.query;
  try {
    await recalculatePlayerAverages();

    if (reason && typeof reason === 'string') {
      const authToken = returnAuthToken(req);
      if (!authToken) {
        error('No admin found for audit recalculating player averages');
      } else {
        const userInfo = await admin.auth().verifyIdToken(authToken);
        const auditData: Audit = {
          admin: userInfo?.email || '',
          description: ' recalculated player averages',
          reason
        };
        await addAudit(auditData);
      }
    }

    return res.status(200).send('Recalculated player averages');
  } catch (err) {
    error('Error recalculating player averages', err);
    return res.status(500).send('Error recalculating player averages');
  }
};

export const generateLeagueAverageAPI = async (req: Request, res: Response) => {
  const { reason } = req.query;
  try {
    await generateLeagueAverage();

    if (reason && typeof reason === 'string') {
      const authToken = returnAuthToken(req);
      if (!authToken) {
        error('No admin found for audit generating league average');
      } else {
        const userInfo = await admin.auth().verifyIdToken(authToken);
        const auditData: Audit = {
          admin: userInfo?.email || '',
          description: ' generated league average',
          reason
        };
        await addAudit(auditData);
      }
    }

    return res.status(200).send('Generated league average');
  } catch (err) {
    error('Error generating league average', err);
    return res.status(500).send('Error generating league average');
  }
};

export default { recalculatePlayerAverageAPI, generateLeagueAverageAPI };

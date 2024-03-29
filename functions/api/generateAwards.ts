import { Request, Response } from 'express';
import { log, error } from 'firebase-functions/logger';
import admin from 'firebase-admin';
import { PlayerData } from '../types';

export const generateAwards = async (req: Request, res: Response) => {
  try {
    log('Generating awards');

    // * Awards is a collection that holds a playerID for each award
    /*     const awards = {
      mvp: '',
      dpoy: '',
      poaDefender: '',
      bestShooter: '',
      worstShooter: '',
      allNBA: []
    }; */

    const db = admin.firestore();
    const querySnapshot = await db.collection('players').get();
    const playerList: PlayerData[] = [];
    querySnapshot.docs.forEach((doc) => {
      const playerData = doc.data();
      if (playerData?.gp) {
        playerList.push(playerData as PlayerData);
      }
    });

    return res.status(200).send('Generated awards');
  } catch (err) {
    error('Error generating awards', err);
    return res.status(500).send('Error generating awards');
  }
};

export default {};

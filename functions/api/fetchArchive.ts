import admin from 'firebase-admin';
import { error } from 'firebase-functions/logger';
import { Request, Response } from 'express';
import dayjs from 'dayjs';

export const fetchArchive = async (req: Request, res: Response): Promise<Response<any>> => {
    const { year } = req.query;

    if (!year || typeof year !== 'string') {
        return res.status(400).send('Invalid year passed');
    }

    if (!dayjs(year, 'YYYY').isValid()) {
        return res.status(400).send('Invalid year format');
    }

    const db = admin.firestore();
    const archiveCollection = `playersArchive-${year}`;
    // * Archived data could be different from year to year, so type has to be any[]
    let playerData: any[] = [];
    try {
        const snapshot = await db.collection(archiveCollection).get();
        snapshot.forEach((doc) => {
            playerData.push(doc.data());
        });
        return res.status(200).send(playerData);
    } catch (err) {
        error(err);
        return res.status(500).send('Error fetching archive data');
    }
}

export default {}
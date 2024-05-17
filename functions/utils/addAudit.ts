import { Audit } from '../types/audits';
import admin from 'firebase-admin';
import { error } from 'firebase-functions/logger';

export const addAudit = async (data: Audit) => {
  try {
    const audits = {
      ...data,
      createdAt: new Date().toISOString()
    };
    const db = admin.firestore();
    await db.collection('audits').doc().set(audits);
  } catch (err) {
    error('Error adding audits', err);
  }
};

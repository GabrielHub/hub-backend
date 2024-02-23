import { Request, Response } from 'express';
import { recalculatePlayerAverages } from './scheduled/recalculatePlayerAverages';

// * Just using this to test some stuff I don't want to set up the firestore emulator for
const testFirebaseStuff = async (req: Request, res: Response): Promise<void> => {
  await recalculatePlayerAverages();
  res.status(200);
};

export default testFirebaseStuff;

import { Request, Response } from 'express';
import { archiveData } from '../scripts/archiveData';
// * Just using this to test some stuff I don't want to set up the firestore emulator for
const testFirebaseStuff = async (req: Request, res: Response): Promise<void> => {
  await archiveData();

  res.status(200);
};

export default testFirebaseStuff;

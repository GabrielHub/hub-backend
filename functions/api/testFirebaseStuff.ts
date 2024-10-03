import { Request, Response } from 'express';
import { archiveData } from '../scripts/archiveData';
import { MOCK_UPLOAD_DATA_ONE } from '../mocks/mockUploadData';
import uploadStats from './upload';

// * Just using this to test some stuff I don't want to set up the firestore emulator for
const testFirebaseStuff = async (req: Request, res: Response): Promise<void> => {
  // Test uploadStats with mock data
  const mockReq = {
    body: MOCK_UPLOAD_DATA_ONE
  } as Request;

  try {
    await uploadStats(mockReq, res);
    console.log('uploadStats test completed successfully');
  } catch (error) {
    console.error('Error testing uploadStats:', error);
  }

  // Original archiveData call
  await archiveData();

  res.status(200).send('Test completed');
};

export default testFirebaseStuff;

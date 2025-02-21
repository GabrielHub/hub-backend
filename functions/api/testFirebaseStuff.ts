import { Request, Response } from 'express';
import fetchForTableByPosition from './fetchForTableByPosition';

const MOCK_POSITION = '1';

// * Just using this to test some stuff I don't want to set up the firestore emulator for
const testFirebaseStuff = async (req: Request, res: Response): Promise<void> => {
  // Test uploadStats with mock data
  const mockReq = {
    query: {
      position: MOCK_POSITION
    }
  } as Partial<Request>;

  try {
    await fetchForTableByPosition(mockReq as Request, res);
    console.log('uploadStats test completed successfully');
  } catch (error) {
    console.error('Error testing uploadStats:', error);
  }

  res.status(200).send('Test completed');
};

export default testFirebaseStuff;

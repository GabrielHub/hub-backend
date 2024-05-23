import NodeCache from 'node-cache';
import { Request, Response } from 'express';
import { getLeagueData } from '../utils';

const cache = new NodeCache({ stdTTL: 3599 });

// * Fetches players for table
const fetchLeagueAverages = async (req: Request, res: Response): Promise<void> => {
  if (cache.has('leagueData')) {
    res.send(cache.get('leagueData'));
  } else {
    const league = await getLeagueData();

    cache.set('leagueData', league);
    res.send(league);
  }
};

export default fetchLeagueAverages;

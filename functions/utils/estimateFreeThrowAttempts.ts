import poisson from '@stdlib/random/base/poisson';
import { warn } from 'firebase-functions/logger';

// TODO This sometimes generates a fta that is like 200, make sure this doesn't happen...

// * Use a binomial distribution to estimate free throws made
// * We only run this function if ftm is more than 1 (cannot account for missing all free throws)
export const estimateFreeThrowAttempts = (ftm: number, ftPerc: number): number => {
  // ! Sometimes this value is negative... give them the same attempts as made if that is the case
  const meanAttempts = Math.round(ftm / (ftPerc / 100));
  if (meanAttempts < 0 || meanAttempts < ftm) {
    warn('meanAttempts is less than 0 or less than ftm', { meanAttempts, ftm });
    return ftm;
  }
  const dist = poisson.factory(meanAttempts); // * create a Poisson distribution with the mean equal to the estimated number of free throw attempts
  const randomAttempts = dist(); // * generate a random number of free throw attempts using the Poisson distribution
  return randomAttempts;
};

export default {};

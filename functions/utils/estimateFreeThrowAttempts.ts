import poisson from "@stdlib/random/base/poisson";

// TODO This sometimes generates a fta that is like 200, make sure this doesn't happen...

// * Use a binomial distribution to estimate free throws made
// * We only run this function if ftm is more than 1 (cannot account for missing all free throws)
const estimateFreeThrowAttempts = (ftm: number, ftPerc: number): number => {
  const meanAttempts = Math.round(ftm / (ftPerc / 100));
  const dist = poisson.factory(meanAttempts); // * create a Poisson distribution with the mean equal to the estimated number of free throw attempts
  const randomAttempts = dist(); // * generate a random number of free throw attempts using the Poisson distribution
  return randomAttempts;
};

export default estimateFreeThrowAttempts;

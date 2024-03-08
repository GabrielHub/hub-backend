export const movedUp = '(↑)';
export const movedDown = '(↓)';
export const movedUpExtra = '(↑↑)';
export const movedDownExtra = '(↓↓)';

const RATING_CONFIG = {
  GLeague: 3,
  Bench: 4.3,
  Rotation: 5,
  Starter: 5.4,
  SecondOption: 6.5,
  AllStar: 7.5,
  /** Highest value is 10 */
  Superstar: 10
};

export const mapRatingToString = (value: number): string => {
  const rating = Object.keys(RATING_CONFIG)
    .sort((a, b) => RATING_CONFIG[a] - RATING_CONFIG[b])
    .find((key) => value <= RATING_CONFIG[key]);

  return rating || 'MVP';
};

export const ratingThresholds = () => Object.values(RATING_CONFIG);

export const calculateRating = (PER: number): number => {
  // Take a PER from 0 to 35+ and convert it to a 0-10 scale. a PER of 15 is always 5
  let rating = 10;
  if (PER <= 0) {
    rating = 0;
  }
  if (PER <= 15) {
    rating = (PER / 15) * 5;
  }
  if (PER <= 35) {
    rating = ((PER - 15) / 20) * 5 + 5;
  }

  return rating;
};

export const roundToNearestThreshold = (rating: number): number => {
  const ratingThresholdList = ratingThresholds();
  let closest = ratingThresholdList[0];
  for (let i = 1; i < ratingThresholdList.length; i++) {
    if (Math.abs(ratingThresholdList[i] - rating) < Math.abs(closest - rating)) {
      closest = ratingThresholdList[i];
    }
  }
  return closest;
};

export default {};

import { GameData } from '../types';

const movedUp = '(↑)';
const movedDown = '(↓)';
const movedUpExtra = '(↑↑)';
const movedDownExtra = '(↓↓)';

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

const sortedRatingKeys = Object.keys(RATING_CONFIG).sort(
  (a, b) => RATING_CONFIG[a] - RATING_CONFIG[b]
);

const mapRatingToString = (value: number): string => {
  const rating = Object.keys(RATING_CONFIG)
    .sort((a, b) => RATING_CONFIG[a] - RATING_CONFIG[b])
    .find((key) => value <= RATING_CONFIG[key]);

  return rating || 'MVP';
};

const calculateRating = (PER: number): number => {
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

export const calculatePlayerRating = (
  gameData: GameData[],
  prevRating: number,
  gpSinceLastRating: number,
  leaguePER: number,
  leagueAPER: number | undefined,
  paceAdjustment: number
): {
  rating: number;
  ratingString: string;
  ratingMovement: string;
  newGPSinceLastRating: number;
} => {
  // * Rating should be based on the last 82 games played
  const sortedGameData = gameData
    .sort((a, b) => b._createdAt.seconds - a._createdAt.seconds)
    .slice(0, 82);

  let uPER = 0;
  let uPERCount = 0;
  // * get the PER using this gameData
  sortedGameData.forEach((data) => {
    if (data?.uPER !== undefined) {
      uPER += data.uPER;
      uPERCount += 1;
    }
  });

  uPER = uPER / uPERCount;

  // * Recalculate PER here and readjust for new pace
  const aPER = paceAdjustment * uPER;
  const PER = aPER * (leaguePER / (leagueAPER || aPER));

  const shouldUpdateRating = gpSinceLastRating !== gameData.length;
  const rating = calculateRating(PER);
  const ratingString = mapRatingToString(rating);
  let ratingMovement = '';

  if (shouldUpdateRating && prevRating && rating) {
    // if the rating diff crosses a threshold, note that the rating has moved up or down. if the rating is the same, remove the note. IF the rating crosses two thresholds, note that the rating has moved up or down twice
    const currentRatingIndex = sortedRatingKeys.indexOf(ratingString);
    const prevRatingIndex = sortedRatingKeys.indexOf(mapRatingToString(prevRating));

    if (currentRatingIndex > prevRatingIndex) {
      ratingMovement = currentRatingIndex - prevRatingIndex === 1 ? movedUp : movedUpExtra;
    } else if (currentRatingIndex < prevRatingIndex) {
      ratingMovement = prevRatingIndex - currentRatingIndex === 1 ? movedDown : movedDownExtra;
    } else {
      ratingMovement = '';
    }
  }

  const newGPSinceLastRating = gameData.length;
  return { rating, ratingString, ratingMovement, newGPSinceLastRating };
};

export default {};

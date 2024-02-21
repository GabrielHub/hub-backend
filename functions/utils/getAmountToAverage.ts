import { GameData } from "../types";

/**
 * @description Counts how many times a stat exists in an array of games
 * @param gameData
 * @param stat
 * @returns number of times a stat exists to use to divide totals
 */
const getAmountToAverage = (gameData: GameData[], stat: string): number => {
  return gameData.reduce((count, game) => {
    if (Object.prototype.hasOwnProperty.call(game, stat)) {
      return count + 1;
    }
    return count;
  }, 0);
};

export default getAmountToAverage;

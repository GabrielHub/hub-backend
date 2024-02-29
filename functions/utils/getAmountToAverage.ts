import { GameData } from '../types';

// * Counts how many times a stat exists in an array of games
export const getAmountToAverage = (gameData: GameData[], stat: string): number => {
  return gameData.reduce((count, game) => {
    if (Object.prototype.hasOwnProperty.call(game, stat) && game.isAI !== 1) {
      return count + 1;
    }
    return count;
  }, 0);
};

export default {};

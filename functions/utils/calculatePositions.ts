import { GameData, PlayerPositions } from '../types';

const fixPositions = (positions: PlayerPositions): PlayerPositions => {
  // * Sort positions by most games played, and remove the positions with 0 games played
  const sortedPositions = Object.entries(positions).sort((a, b) => b[1] - a[1]);
  const filteredPositions = sortedPositions.filter((pos) => pos[1] > 0);
  return filteredPositions.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
};

export const getPositions = (gameData: GameData[]): PlayerPositions => {
  // Abstract the code in calculateAveragePlayerStats that gets the positions and use it here
  const positions: PlayerPositions = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };
  gameData.forEach((data) => {
    if (data.pos && positions[data.pos] !== undefined) {
      positions[data.pos] += 1;
    }
  });
  return fixPositions(positions);
};

export default {};

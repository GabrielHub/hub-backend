import { NBAPlayerStats, PlayerData, SimilarPlayer, TotalNBAData } from '../types';
import { PER_100, PER_36_MINUTES } from '../constants';

const weights = {
  pts: 0.9,
  treb: 2,
  ast: 2,
  stl: 1.8,
  blk: 1.8,
  fga: 1.5,
  fgm: 1,
  threepa: 1.5,
  threepm: 1,
  tov: 1,
  pf: 0.4
};

const normalizeStats = (stat: number, mp: number, pace: number, perGame: string): number => {
  if (perGame === PER_36_MINUTES) {
    return (stat / mp) * 36;
  } else if (perGame === PER_100) {
    return (stat / pace) * 100;
  } else {
    return stat;
  }
};

export const findSimilarPlayers = (
  player: PlayerData,
  nbaPlayers: TotalNBAData,
  perGame: string
): SimilarPlayer[] => {
  const playerMin = 20;
  const playerPace = player.pace;

  // * Calculate the weighted Euclidean distance between the given player and all the players in the NBA array
  const distances = Object.values(nbaPlayers).map((nbaPlayer: NBAPlayerStats) => {
    const {
      PTS: nbaPTS,
      REB: nbaREB,
      AST: nbaAST,
      STL: nbaSTL,
      BLK: nbaBLK,
      FGA: nbaFGA,
      FGM: nbaFGM,
      FG3A: nba3PA,
      FG3M: nba3PM,
      TOV: nbaTOV,
      PF: nbaPF
    } = nbaPlayer;

    // refactor diff code to normalize player stats instead of nba stats
    const ptsDiff =
      (weights.pts * (normalizeStats(player.pts, playerMin, playerPace, perGame) - nbaPTS)) ** 2;
    const rebDiff =
      (weights.treb * (normalizeStats(player.treb, playerMin, playerPace, perGame) - nbaREB)) ** 2;
    const astDiff =
      (weights.ast * (normalizeStats(player.ast, playerMin, playerPace, perGame) - nbaAST)) ** 2;
    const stlDiff =
      (weights.stl * (normalizeStats(player.stl, playerMin, playerPace, perGame) - nbaSTL)) ** 2;
    const blkDiff =
      (weights.blk * (normalizeStats(player.blk, playerMin, playerPace, perGame) - nbaBLK)) ** 2;

    const fgaDiff =
      (weights.fga * (normalizeStats(player.fga, playerMin, playerPace, perGame) - nbaFGA)) ** 2;
    const fgmDiff =
      (weights.fgm * (normalizeStats(player.fgm, playerMin, playerPace, perGame) - nbaFGM)) ** 2;
    const threepaDiff =
      (weights.threepa *
        (normalizeStats(player.threepa, playerMin, playerPace, perGame) - nba3PA)) **
      2;
    const threepmDiff =
      (weights.threepm *
        (normalizeStats(player.threepm, playerMin, playerPace, perGame) - nba3PM)) **
      2;
    const tovDiff =
      (weights.tov * (normalizeStats(player.tov, playerMin, playerPace, perGame) - nbaTOV)) ** 2;
    const pfDiff =
      (weights.pf * (normalizeStats(player.pf, playerMin, playerPace, perGame) - nbaPF)) ** 2;

    const distance = Math.sqrt(
      ptsDiff +
        rebDiff +
        astDiff +
        stlDiff +
        blkDiff +
        fgaDiff +
        fgmDiff +
        threepaDiff +
        threepmDiff +
        tovDiff +
        pfDiff
    );

    return { player: nbaPlayer, distance };
  });

  // * Sort the distances in ascending order
  distances.sort((a, b) => a.distance - b.distance);

  // * Return the top 3 most similar players
  return distances.slice(0, 3).map((d) => {
    const similarity = 100 - d.distance;
    return { ...d.player, similarity };
  });
};

export default {};

import { NBAPlayerData, PlayerData, SimilarPlayer } from '../types';

const weights = {
  pts: 0.9,
  treb: 2,
  ast: 2,
  stl: 1.8,
  blk: 1.8,
  fga: 1.5,
  fgm: 1,
  twopa: 1,
  threepa: 1.5,
  threepm: 1,
  tov: 1,
  pf: 0.4
};

/**
 * @description Normalize NBA stats to 20 min per game
 */
const normalizeStats = (stat: number, min: number, gp: number): number => {
  const minPlayed = min / gp;
  return (stat / minPlayed) * 20;
};

/**
 * @description finds the most similar nba players to a 2k player and returns closest 3
 * @param {*} player player data
 * @param {*} nbaPlayers Array of nba player data
 * @returns Array of 3 most similar players
 */
export const findSimilarPlayers = (player: PlayerData, nbaPlayers: NBAPlayerData[]): SimilarPlayer[] => {
  // * Calculate the weighted Euclidean distance between the given player and all the players in the NBA array
  const distances = nbaPlayers.map((nbaPlayer) => {
    const {
      MP: mp,
      gp,
      pts,
      trb,
      ast,
      stl,
      blk,
      fga,
      fgm,
      twopa,
      threepa,
      threepm,
      tov,
      PF: pf
    } = nbaPlayer;

    const ptsDiff = (weights.pts * (player.pts - normalizeStats(pts, mp, gp))) ** 2;
    const rebDiff = (weights.treb * (player.treb - normalizeStats(trb, mp, gp))) ** 2;
    const astDiff = (weights.ast * (player.ast - normalizeStats(ast, mp, gp))) ** 2;
    const stlDiff = (weights.stl * (player.stl - normalizeStats(stl, mp, gp))) ** 2;
    const blkDiff = (weights.blk * (player.blk - normalizeStats(blk, mp, gp))) ** 2;

    const fgaDiff = (weights.fga * (player.fga - normalizeStats(fga, mp, gp))) ** 2;
    const fgmDiff = (weights.fgm * (player.fgm - normalizeStats(fgm, mp, gp))) ** 2;
    const twopaDiff = (weights.twopa * (player.twopa - normalizeStats(twopa, mp, gp))) ** 2;
    const threepaDiff = (weights.threepa * (player.threepa - normalizeStats(threepa, mp, gp))) ** 2;
    const threepmDiff = (weights.threepm * (player.threepm - normalizeStats(threepm, mp, gp))) ** 2;
    const tovDiff = (weights.tov * (player.tov - normalizeStats(tov, mp, gp))) ** 2;
    const pfDiff = (weights.pf * (player.pf - normalizeStats(pf, mp, gp))) ** 2;

    const distance = Math.sqrt(
      ptsDiff +
        rebDiff +
        astDiff +
        stlDiff +
        blkDiff +
        fgaDiff +
        fgmDiff +
        twopaDiff +
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

export default findSimilarPlayers;

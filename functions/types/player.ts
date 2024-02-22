export interface PlayerData {
  name: string;
  alias: string[];
  ftPerc: number;
  pace: number;
  pts: number;
  treb: number;
  ast: number;
  stl: number;
  blk: number;
  pf: number;
  tov: number;
  fgm: number;
  fga: number;
  twopm: number;
  twopa: number;
  threepm: number;
  threepa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  drebPerc: number;
  astPerc: number;
  tovPerc: number;
  usageRate: number;
  ortg: number;
  drtg: number;
  gameScore: number;
  dd: number;
  td: number;
  qd: number;
  o3PA: number;
  o3PM: number;
  oFGA: number;
  oFGM: number;
  aPER: number;
  gp?: number;
  fgPerc?: number | null;
  twoPerc?: number | null;
  threePerc?: number | null;
  tsPerc?: number | null;
  efgPerc?: number | null;
  threepAR?: number;
  astToRatio?: number;
  oFGPerc?: number | null;
  o3PPerc?: number | null;
  oEFGPerc?: number | null;
  offensiveRanking?: number;
  defensiveRanking?: number;
  PER?: number;
  uPER?: number;
  mp: number;
  aPERGamesPlayed?: number;
}

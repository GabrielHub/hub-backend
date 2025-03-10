export interface PlayerPositions {
  [key: number]: number;
}

export interface PlayerData {
  name: string;
  alias: string[];
  ftPerc: number | null;
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
  gp: number;
  fgPerc: number | null;
  twoPerc: number | null;
  threePerc: number | null;
  tsPerc: number | null;
  efgPerc: number | null;
  threepAR: number;
  astToRatio: number;
  oFGPerc: number | null;
  o3PPerc: number | null;
  oEFGPerc: number | null;
  PER: number;
  uPER: number;
  mp: number;
  plusMinus: number;
  rating: number;
  ratingString: string;
  ratingMovement: string;
  gpSinceLastRating: number;
  positions?: PlayerPositions;
  estPoss?: number;
  eBPM?: number;
  bpm?: number;
  estPointsPer100?: number;
  stopsPer100?: number;
  pProd?: number;
  grd?: string;
  elo?: number;
  win?: number;
  loss?: number;
  // * Required for sub collection position filtering
  position?: number;
}

export interface NBAPlayerData {
  Age: number;
  GS: number;
  MP: number;
  PF: number;
  Rk: number;
  Tm: string;
  ast: number;
  blk: number;
  dreb: number;
  drtg: number;
  fgPerc: number;
  fga: number;
  fgm: number;
  ftPerc: number;
  fta: number;
  ftm: number;
  gp: number;
  id: string;
  name: string;
  oreb: number;
  ortg: number;
  pos: string;
  pts: number;
  stl: number;
  threepPerc: number;
  threepa: number;
  threepm: number;
  tov: number;
  trb: number;
  twopPerc: number;
  twopa: number;
  twopm: number;
}

export interface SimilarPlayer extends NBAPlayerData {
  similarity: number;
}

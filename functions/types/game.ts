export interface GameTriggerData {
  date: string;
  status: string;
}

export interface GameData {
  id: string;
  ast: number;
  astPerc?: number;
  blk: number;
  dd: number;
  dreb: number;
  drebPerc?: number;
  drtg?: number;
  fga: number;
  fgm: number;
  floorPerc?: number;
  fta: number;
  ftm: number;
  gameScore?: number;
  gameTrigger?: GameTriggerData;
  grd: string;
  mp: number;
  name: string;
  o3PA: number;
  o3PM: number;
  oFGA: number;
  oFGM: number;
  oreb: number;
  ortg?: number;
  pf: number;
  pos: number;
  pts: number;
  qd: number;
  stl: number;
  td: number;
  team: number;
  threepa: number;
  threepm: number;
  tov: number;
  tovPerc?: number;
  treb: number;
  twopa: number;
  twopm: number;
  usageRate?: number;
  aPER?: number;
  isAI: number;
}

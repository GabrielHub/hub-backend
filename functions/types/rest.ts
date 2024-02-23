export interface RawPlayerData {
  pos: number;
  oppPos: number;
  id: string;
  team: number;
  name: string;
  grd: string;
  pts: number;
  treb: number;
  ast: number;
  stl: number;
  blk: number;
  pf: number;
  tov: number;
  fgm: number;
  fga: number;
  threepm: number;
  threepa: number;
}

export interface RawTeamData {
  id: string;
  team: number;
  name: string;
  grd: string;
  pts: number;
  treb: number;
  ast: number;
  stl: number;
  blk: number;
  pf: number;
  tov: number;
  fgm: number;
  fga: number;
  threepm: number;
  threepa: number;
}

export interface TotalRawTeamData {
  [key: number]: RawTeamData;
}

export default {};

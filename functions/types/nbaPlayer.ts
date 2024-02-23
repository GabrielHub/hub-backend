export interface NBAPlayerStats {
  PLAYER_ID: number;
  PLAYER_NAME: string;
  NICKNAME: string;
  TEAM_ID: number;
  TEAM_ABBREVIATION: string;
  AGE: number;
  GP: number;
  W: number;
  L: number;
  W_PCT: number;
  MIN: number;
  FGM: number;
  FGA: number;
  FG_PCT: number;
  FG3M: number;
  FG3A: number;
  FG3_PCT: number;
  FTM: number;
  FTA: number;
  FT_PCT: number;
  OREB: number;
  DREB: number;
  REB: number;
  AST: number;
  TOV: number;
  STL: number;
  BLK: number;
  BLKA: number;
  PF: number;
  PFD: number;
  PTS: number;
  PLUS_MINUS: number;
  NBA_FANTASY_PTS: number;
  DD2: number;
  TD3: number;
  WNBA_FANTASY_PTS: number;
  GP_RANK: number;
  W_RANK: number;
  L_RANK: number;
  W_PCT_RANK: number;
  MIN_RANK: number;
  FGM_RANK: number;
  FGA_RANK: number;
  FG_PCT_RANK: number;
  FG3M_RANK: number;
  FG3A_RANK: number;
  FG3_PCT_RANK: number;
  FTM_RANK: number;
  FTA_RANK: number;
  FT_PCT_RANK: number;
  OREB_RANK: number;
  DREB_RANK: number;
  REB_RANK: number;
  AST_RANK: number;
  TOV_RANK: number;
  STL_RANK: number;
  BLK_RANK: number;
  BLKA_RANK: number;
  PF_RANK: number;
  PFD_RANK: number;
  PTS_RANK: number;
  PLUS_MINUS_RANK: number;
  NBA_FANTASY_PTS_RANK: number;
  DD2_RANK: number;
  TD3_RANK: number;
  WNBA_FANTASY_PTS_RANK: number;
}

export interface TotalNBAData {
  [key: number]: NBAPlayerStats;
}

export interface SimilarPlayer extends NBAPlayerStats {
  similarity: number;
}

export default {};

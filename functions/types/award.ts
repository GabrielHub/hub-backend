interface AwardObject {
  id: string;
  name: string;
  value: number | string;
  positions?: string[] | number[];
}

export interface Award {
  /** Highest PER, min 25 games */
  mvp: AwardObject;
  /** Lowest DRTG, min 25 games */
  dpoy: AwardObject;
  /** Lowest DRTG for poaDefender games, min 25 games */
  poaDefender: AwardObject;
  /** Highest 3P% weighted 40/40/20 with 3PA and high three point attempt rate, min 82 3PA */
  bestShooter: AwardObject;
  /** Lowest 3P%:3PaR ratio, min 82 3PA */
  worstShooter: AwardObject;
  /** Most games played */
  mostActive: AwardObject;
  /** lowest (AST%/USG%), min 25 games */
  ballHog: AwardObject;
  /** Highest EFG% * AST/TOV value, min 300 FGA */
  mostEfficient: AwardObject;
  /** Lowest EFG% * AST/TOV value, min 300 FGA */
  leastEfficient: AwardObject;
  /** Lowest EFG%, min 300 FGA and 10 FGA per game */
  shotChucker: AwardObject;
  /** Highest pace:USG% ratio, min 25 games */
  fastbreakPlayer: AwardObject;
  /** Lowest OFG%/(blk) ratio, min 300 OFGA */
  bestIntimidator: AwardObject;
  /** Highest AST%/USG% - TOV%/USG%, min 25 games */
  bestPasser: AwardObject;
  /** Highest TOV% weighted 50% with TOV, min 25 games */
  turnoverMachine: AwardObject;
  /** Highest ratio of (ortg - drtg)/USG%, min 25 games */
  bestTwoWay: AwardObject;
  /** Top 5 highest PER, min 25 games */
  allNBAFirst: AwardObject[];
  /** Top 5 PER after allNBAFirst, min 25 games */
  allNBASecond: AwardObject[];
  /** Top 5 lowest Drtg, min 25 games */
  allDefensiveFirst: AwardObject[];
}

export default {};

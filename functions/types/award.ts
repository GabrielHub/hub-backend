interface AwardObject {
  id: string;
  name: string;
  value: number | string;
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
  /** Lowest 3P% weighted 80/20 with  three point attempt rate, min 82 3PA */
  worstShooter: AwardObject;
  /** Most games played */
  mostActive: AwardObject;
  /** highest USG%, min 25 games */
  mostUsed: AwardObject;
  /** lowest USG%, min 25 games */
  leastUsed: AwardObject;
  /** Highest EFG%, min 300 FGA */
  mostEfficient: AwardObject;
  /** Lowest EFG%, min 300 FGA */
  leastEfficient: AwardObject;
  /** Lowest EFG% weighted 50/50 with high FGA, min 300 FGA */
  shotChucker: AwardObject;
  /** Highest pace weighted 80/20 with FGA, min 25 games */
  fastbreakPlayer: AwardObject;
  /** Most OFGA, min 300 OFGA */
  mostAttacked: AwardObject;
  /** Lowest OFG% weighted 50/50 with OFGA, min 300 OFGA */
  bestIntimidator: AwardObject;
  /** Top 5 highest PER, min 25 games */
  allNBAFirst: AwardObject[];
  /** Top 5 PER after allNBAFirst, min 25 games */
  allNBASecond: AwardObject[];
}

export default {};

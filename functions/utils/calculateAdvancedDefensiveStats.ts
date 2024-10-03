import { PlayerData, RawPlayerData, TeamData } from '../types';

export const calculateAdvancedDefensiveStats = (
  player: PlayerData,
  opponent: RawPlayerData,
  opOREB: number,
  team: TeamData
) => {
  // * Calculating advanced defensive stats (we only calculate the advanced stats that require opponent or team numbers)
  // * Stats that do not require opponent or team info we can average elsewhere

  const opFTDivision = opponent.fta !== 0 ? opponent.ftm / opponent.fta : 0;
  const opMin = 20;

  // Adjust the scaling factor for shorter games
  const scalingFactor = 48 / opMin; // This will be 2.4 for 20-minute games

  const dorPerc = opOREB / (opOREB + team.dreb);
  // * If an opponent takes 0 shots, defensive rating cannot be calculated
  const dfgPerc = opponent.fgm / opponent.fga;
  const FMWT = (dfgPerc * (1 - dorPerc)) / (dfgPerc * (1 - dorPerc) + (1 - dfgPerc) * dorPerc);
  const stops =
    player.stl +
    player.blk * FMWT * (1 - 1.07 * dorPerc) +
    player.dreb * (1 - FMWT) +
    ((((opponent.fga - opponent.fgm - team.blk) / team.mp) * FMWT * (1 - 1.07 * dorPerc) +
      (opponent.tov - team.stl) / team.mp) *
      player.mp +
      (player.pf / team.pf) * 0.4 * opponent.fta * (1 - opFTDivision) ** 2);

  const stopPerc = (stops * opMin) / (team.totalPoss * player.mp);
  const teamDefensiveRating = 100 * (opponent.pts / team.totalPoss);
  const defensivePtsPerScoringPoss =
    opponent.pts / (opponent.fgm + (1 - (1 - opFTDivision)) ** 2 * opponent.fta * 0.4);

  // * DRTG:  how many points the player allowed per 100 possessions he individually faced while on the court.
  const drtg =
    teamDefensiveRating +
    0.2 * scalingFactor * (100 * defensivePtsPerScoringPoss * (1 - stopPerc) - teamDefensiveRating);

  // * DRB%: the percentage of available defensive rebounds a player grabbed while he was on the floor. 0 is the opponents offensive rebounds
  const drebPerc = (100 * (player.dreb * (team.mp / 5))) / (player.mp * (team.dreb + opOREB));

  // * opponent efficiency
  const oFGA = opponent.fga;
  const oFGM = opponent.fgm;
  const o3PA = opponent.threepa;
  const o3PM = opponent.threepm;

  return { drtg, drebPerc, oFGA, oFGM, o3PA, o3PM };
};

export default {};

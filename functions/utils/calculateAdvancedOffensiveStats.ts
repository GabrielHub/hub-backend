import { PlayerData, TeamData } from '../types';

export const calculateAdvancedOffensiveStats = (player: PlayerData, team: TeamData) => {
  // * Calculating advanced offensive stats (we only calculate the advanced stats that require opponent or team numbers)
  // * Stats that do not require opponent or team info we can average elsewhere

  const ftDivision = player.fta !== 0 ? player.ftm / player.fta : 1; // * Need to prevent division by 0

  const qAst =
    (player.mp / (team.mp / 5)) * (1.14 * ((team.ast - player.ast) / team.fgm)) +
    (((team.ast / team.mp) * player.mp * 5 - player.ast) /
      ((team.fgm / team.mp) * player.mp * 5 - player.fgm)) *
      (1 - player.mp / (team.mp / 5));

  // * Possessions
  const missedFGPoss = (player.fga - player.fgm) * (1 - 1.07 * team.ORBPerc);
  const missedFTPoss = (1 - ftDivision) ** 2 * 0.4 * player.fta;

  const fgPart = player.fgm * (1 - 0.5 * ((player.pts - player.ftm) / (2 * player.fga)) * qAst);
  const astPart =
    0.5 *
    ((team.pts - team.ftm - (player.pts - player.ftm)) / (2 * (team.fga - player.fga))) *
    player.ast;
  const ftPart = (1 - (1 - ftDivision)) ** 2 * 0.4 * player.fta;
  const orbPart = player.oreb * team.ORBWeight * team.playPerc;

  const scoringPoss =
    (fgPart + astPart + ftPart) *
      (1 - (team.oreb / team.scoringPoss) * team.ORBWeight * team.playPerc) +
    orbPart;

  const totalPoss = scoringPoss + missedFGPoss + missedFTPoss + player.tov;

  const pProdFGPart =
    2 *
    (player.fgm + 0.5 * player.threepm) *
    (1 - 0.5 * ((player.pts - player.ftm) / (2 * player.fga)) * qAst);

  const pProdAstPart =
    2 *
    ((team.fgm - player.fgm + 0.5 * (team.threepm - player.threepm)) / (team.fgm - player.fgm)) *
    0.5 *
    ((team.pts - team.ftm - (player.pts - player.ftm)) / (2 * (team.fga - player.fga))) *
    player.ast;

  const pProdORBPart =
    player.oreb *
    team.ORBWeight *
    team.playPerc *
    (team.pts / (team.fgm + (1 - (1 - ftDivision)) ** 2 * 0.4 * team.fta));

  const pProd =
    (pProdFGPart + pProdAstPart + player.ftm) *
      (1 - (team.oreb / team.scoringPoss) * team.ORBWeight * team.playPerc) +
    pProdORBPart;

  // * ORTG : Individual offensive rating is the number of points produced by a player per hundred total individual possessions
  const ortg = 100 * (pProd / totalPoss);

  // * Floor% : What percentage of the time that a player wants to score does he actually score
  const floorPerc = 100 * (scoringPoss / totalPoss);

  // * Ast%: estimates, not calculates) what percentage of made shots by teammates were assisted by a player while he was on the floor.
  const astPerc = 100 * (player.ast / ((player.mp / (team.mp / 5)) * team.fgm - player.fgm));

  // * tovPerc: the number of turnovers a player will make in 100 individual plays
  const tovPerc = 100 * (player.tov / (player.fga + 0.44 * player.fta + player.tov));

  // * usageRate
  const usageRate =
    100 *
    (((player.fga + 0.44 * player.fta + player.tov) * (team.mp / 5)) /
      (player.mp * (team.fga + 0.44 * team.fta + team.tov)));

  // * Game Score: give a rough measure of a player's productivity for a single gam
  const gameScore =
    player.pts +
    0.4 * player.fgm -
    0.7 * player.fga -
    0.4 * (player.fta - player.ftm) +
    0.7 * player.oreb +
    0.3 * player.dreb +
    player.stl +
    0.7 * player.ast +
    0.7 * player.blk -
    0.4 * player.pf -
    player.tov;

  // ? Skip EFG, TS%, points per poss, because we can average that without team data later

  return { ortg, floorPerc, astPerc, tovPerc, usageRate, gameScore };
};

export default {};

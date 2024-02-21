import round from "./roundForReadable";
import getAmountToAverage from "./getAmountToAverage";
import { GameData, LeagueData, PlayerData } from "../types";

/**
 * @description complex check for valid stats. ortg and drtg are sometimes 0, but those are not valid numbers
 * @param {*} stat
 * @param {*} value
 * @returns {boolean}
 */
const isValidStatline = (stat: string, value: any): boolean => {
  return Boolean(
    typeof value !== "string" &&
      !Number.isNaN(value) &&
      !(stat === "ortg" && value === 0) &&
      !(stat === "drtg" && value === 0),
  );
};

/**
 * @description format and calculate player averages for player object
 * @param {*} gameData required
 * @param {*} name required
 * @param {*} alias
 * @param {*} ftPerc
 * @returns
 */
export const calculateAveragePlayerStats = (
  leagueData: LeagueData,
  gameData: GameData[],
  name: string,
  alias: string[] = [],
  ftPerc = 50,
) => {
  // * These are not values we want to average
  // * FT% is a constant defined by the user. We won't update this ever programmatically
  const propertiesToSkip = ["name", "alias", "ftPerc"];
  // * Initialize player so we can add values before dividing at the end
  const playerData: PlayerData = {
    name,
    alias: alias.length ? alias : [name],
    ftPerc,
    pace: 0,
    pts: 0,
    treb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    pf: 0,
    tov: 0,
    fgm: 0,
    fga: 0,
    twopm: 0,
    twopa: 0,
    threepm: 0,
    threepa: 0,
    ftm: 0,
    fta: 0,
    oreb: 0,
    dreb: 0,
    drebPerc: 0,
    astPerc: 0,
    tovPerc: 0,
    usageRate: 0,
    ortg: 0,
    drtg: 0,
    gameScore: 0,
    dd: 0,
    td: 0,
    qd: 0,
    o3PA: 0,
    o3PM: 0,
    oFGA: 0,
    oFGM: 0,
    aPER: 0,
    gp: 0,
    fgPerc: 0,
    twoPerc: 0,
    threePerc: 0,
    tsPerc: 0,
    efgPerc: 0,
    threepAR: 0,
    astToRatio: 0,
    oFGPerc: 0,
    o3PPerc: 0,
    oEFGPerc: 0,
    offensiveRanking: 0,
    defensiveRanking: 0,
    PER: 0,
    mp: 0,
  };

  // * DRtg can be NaN if the opponent took 0 fg, so skip over games where this is the case and do different division
  const statsWithNaN = {};

  // * Sum the basic values (some % values are in here because they use team or opponent data)
  gameData.forEach((data) => {
    Object.keys(data).forEach((stat) => {
      if (
        Object.prototype.hasOwnProperty.call(playerData, stat) &&
        !propertiesToSkip.includes(stat)
      ) {
        // * check if number is NaN (skip invalid data from bad data processing)
        if (isValidStatline(stat, data[stat])) {
          // * Normal logic for stats that have values
          playerData[stat] += data[stat];
        } else if (Object.prototype.hasOwnProperty.call(statsWithNaN, stat)) {
          // * Update it with one less games to count for the averages
          statsWithNaN[stat] -= 1;
        } else {
          // * Stat may not exist in all games
          const amountToDivideBy = getAmountToAverage(gameData, stat);
          // * Add this stat to start counting games not including NaN games, minus 1 for the current time we're counting
          statsWithNaN[stat] = amountToDivideBy - 1;
        }
      }
    });
  });

  // * Properties to total and not average
  const propertiesToTotal = ["dd", "td", "qd"];

  // * Average values by number of games and round them
  Object.keys(playerData).forEach((stat) => {
    if (!propertiesToSkip.includes(stat) && !propertiesToTotal.includes(stat)) {
      // TODO figure out how to save precision
      // ? Rounding here saves a loop but also makes the Perc calculations below less precise...

      // * Check if stat is normal (never had a NaN value)
      let divideFactor = 0;
      if (
        Object.prototype.hasOwnProperty.call(statsWithNaN, stat) &&
        statsWithNaN[stat] > 0
      ) {
        // * if there aren't enough games, avoid dividing by 0 or a - number
        divideFactor = statsWithNaN[stat];
      } else {
        // * Should usually be the length, but could possibly not exist
        // * Stats may not exist if they were added after data was being generated (PER, pace, pProd)
        divideFactor = getAmountToAverage(gameData, stat);
      }
      playerData[stat] = round(playerData[stat] / divideFactor);

      // * do not store bad information
      if (Number.isNaN(playerData[stat])) {
        playerData[stat] = null;
      }
    }
  });

  playerData.gp = gameData.length;
  // * Add Percentage values ie. EFG% TS% OFG% etc.
  playerData.fgPerc = round(100 * (playerData.fgm / playerData.fga)) || null;
  playerData.twoPerc =
    round(100 * (playerData.twopm / playerData.twopa)) || null;
  playerData.threePerc =
    round(100 * (playerData.threepm / playerData.threepa)) || null;
  playerData.tsPerc =
    round(
      100 * (playerData.pts / (2 * (playerData.fga + 0.44 * playerData.fta))),
    ) || null;
  playerData.efgPerc =
    round(
      100 * ((playerData.fgm + 0.5 ** playerData.threepm) / playerData.fga),
    ) || null;
  playerData.threepAR = round(100 * (playerData.threepa / playerData.fga));

  playerData.astToRatio = round(playerData.ast / playerData.tov);

  // * Defensive stats (opponent efficiency)
  playerData.oFGPerc = round(100 * (playerData.oFGM / playerData.oFGA)) || null;
  playerData.o3PPerc = round(100 * (playerData.o3PM / playerData.o3PA)) || null;
  playerData.oEFGPerc =
    round(
      100 * ((playerData.oFGM + 0.5 ** playerData.o3PM) / playerData.oFGA),
    ) || null;

  // * Calculate offensive and defensive rankings using weights between ortg/drtg and usage/oFGA

  /*
    For instance, using the 2020-21 NBA season data, the league average usage rate and offensive rating were 20.3% and 110.7, respectively, with standard deviations of 5.8% and 7.2. Using these values, we can calculate the weights as follows:
    Weight of usage rate = 5.8 / (5.8 + 7.2) = 0.446
    Weight of offensive rating = 7.2 / (5.8 + 7.2) = 0.554
  */
  const weightUSG = 0.446;
  const weightORTG = 0.554;
  playerData.offensiveRanking =
    playerData.ortg * weightORTG + playerData.usageRate * weightUSG;

  /*
    The league averages for drtg and oppFGA for the most recent NBA season. For example, in the 2020-21 NBA season, the league average drtg was 111.8 and the league average oppFGA was 89.5. You can use these values to calculate the weights as follows:
    Weight of drtg = 89.5 / (111.8 + 89.5) = 0.444
    Weight of oppFGA = 111.8 / (111.8 + 89.5) = 0.556
  */
  const weightOFGA = 0.556;
  const weightDRTG = 0.444;
  playerData.defensiveRanking =
    playerData.drtg * weightDRTG - playerData.oFGA * weightOFGA;

  // * Recalculate PER here
  playerData.PER =
    playerData.aPER * (leagueData.PER / (leagueData.aPER ?? playerData.aPER));

  return playerData;
};

export default calculateAveragePlayerStats;

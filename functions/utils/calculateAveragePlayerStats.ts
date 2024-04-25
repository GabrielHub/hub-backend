import { round } from 'lodash';
import { calculatePlayerRating } from './ratingUtils';
import { calculateBPM } from './calculateBPM';
import { GameData, LeagueData, PlayerData } from '../types';
import {
  formatPossibleTeammateGrade,
  isValidTeammateGrade,
  mapTeammateGradeToValue,
  mapTeammateValueToGrade
} from './teammateGrades';

/**
 * @description complex check for valid stats. ortg and drtg are sometimes 0, but those are not valid numbers
 * @param {*} stat
 * @param {*} value
 * @return {boolean}
 */
const isValidStatline = (stat: string, value: string | number | undefined | null): boolean => {
  return Boolean(
    value !== undefined &&
      value !== null &&
      typeof value !== 'string' &&
      !Number.isNaN(value) &&
      !(stat === 'ortg' && value === 0) &&
      !(stat === 'drtg' && value === 0)
  );
};

export const calculateAveragePlayerStats = (
  leagueData: LeagueData,
  gameData: GameData[],
  name: string,
  alias: string[] = [],
  ftPerc: number,
  prevRating: number,
  gpSinceLastRating: number
) => {
  // * These are not values we want to average
  // * FT% is a constant defined by the user. We won't update this ever programmatically
  const propertiesToSkip = [
    'name',
    'alias',
    'ftPerc',
    'rating',
    'ratingString',
    'ratingMovement',
    'gpSinceLastRating',
    'isAI',
    'positions',
    'uploadId',
    '_createdAt',
    '_updatedAt',
    'id',
    'elo'
  ];

  // * Initialize player so we can add values before dividing at the end
  const playerData: PlayerData = {
    name,
    gp: 0,
    alias: alias.length ? alias : [name],
    rating: 0,
    ratingString: '',
    ratingMovement: '',
    gpSinceLastRating,
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
    PER: 0,
    uPER: 0,
    mp: 0,
    plusMinus: 0
  };

  // * DRtg can be NaN if the opponent took 0 fg, so skip over games where this is the case and do different division
  const statTotalCount = {};

  // * Sum up wins and losses
  let win = 0;
  let loss = 0;

  // * Sum the basic values (some % values are in here because they use team or opponent data)
  gameData.forEach((data) => {
    if (data?.plusMinus && data.plusMinus > 0) {
      win += 1;
    } else if (data?.plusMinus && data.plusMinus < 0) {
      loss += 1;
    }

    Object.keys(data).forEach((stat) => {
      if (!propertiesToSkip.includes(stat) && playerData?.[stat] !== undefined) {
        // * Initialize statTotalCount for this stat
        if (!statTotalCount?.[stat]) {
          statTotalCount[stat] = 0;
        }

        // * check if number is NaN (skip invalid data from bad data processing)
        if (isValidStatline(stat, data?.[stat])) {
          // * Normal logic for stats that have values
          playerData[stat] += data[stat];
          statTotalCount[stat] += 1;
        }
      }
    });
  });

  // * Properties to total and not average
  const propertiesToTotal = ['dd', 'td', 'qd', 'plusMinus'];

  // * Average values by number of games and round them
  Object.keys(playerData).forEach((stat) => {
    if (!propertiesToSkip.includes(stat) && !propertiesToTotal.includes(stat)) {
      // * Check if stat is normal (never had a NaN value)
      const divideFactor = statTotalCount[stat] || gameData.length;
      playerData[stat] = playerData[stat] / divideFactor;
    }
  });

  playerData.gp = gameData.length;
  // * Add Percentage values ie. EFG% TS% OFG% etc.
  playerData.fgPerc = round(100 * (playerData.fgm / playerData.fga), 1) || null;
  playerData.twoPerc = round(100 * (playerData.twopm / playerData.twopa), 1) || null;
  playerData.threePerc = round(100 * (playerData.threepm / playerData.threepa), 1) || null;
  playerData.tsPerc =
    round(100 * (playerData.pts / (2 * (playerData.fga + 0.44 * playerData.fta))), 1) || null;
  playerData.efgPerc =
    round(100 * ((playerData.fgm + 0.5 * playerData.threepm) / playerData.fga), 1) || null;
  playerData.threepAR = round(100 * (playerData.threepa / playerData.fga), 1);

  playerData.astToRatio = round(playerData.ast / playerData.tov, 1);

  // * Defensive stats (opponent efficiency)
  playerData.oFGPerc = round(100 * (playerData.oFGM / playerData.oFGA), 1) || null;
  playerData.o3PPerc = round(100 * (playerData.o3PM / playerData.o3PA), 1) || null;
  playerData.oEFGPerc =
    round(100 * ((playerData.oFGM + 0.5 ** playerData.o3PM) / playerData.oFGA), 1) || null;

  // * Recalculate PER here and readjust for new pace
  const paceAdjustment = leagueData.pace / playerData.pace;
  playerData.aPER = paceAdjustment * playerData.uPER;
  playerData.PER = playerData.aPER * (leagueData.PER / (leagueData.aPER || playerData.aPER));

  // * Calculate rating
  const { rating, ratingString, ratingMovement, newGPSinceLastRating } = calculatePlayerRating(
    gameData,
    prevRating,
    gpSinceLastRating,
    leagueData.PER,
    leagueData.aPER,
    paceAdjustment
  );
  playerData.rating = rating;
  playerData.ratingString = ratingString;
  playerData.ratingMovement = ratingMovement;
  playerData.gpSinceLastRating = newGPSinceLastRating;

  // * Estimate possessions this player is responsible for
  const estPoss = Math.round(
    playerData.fga + playerData.tov + playerData.ast + playerData.fta * 0.44
  );
  playerData.estPoss = estPoss;

  // * Convert teammate grades to a value, then average them, then convert back to a string.
  let teammateGradeValue = 0;
  let teammateGradeCount = 0;
  gameData.forEach((data) => {
    if (isValidTeammateGrade(data?.grd)) {
      teammateGradeValue += mapTeammateGradeToValue(formatPossibleTeammateGrade(data.grd));
      teammateGradeCount += 1;
    }
  });

  const grd = teammateGradeCount
    ? mapTeammateValueToGrade(teammateGradeValue / teammateGradeCount)
    : 'N/A';

  const { bpm, eBPM, estPointsPer100, stopsPer100, pProd } = calculateBPM(playerData, leagueData);
  playerData.bpm = bpm;
  playerData.eBPM = eBPM;
  playerData.estPointsPer100 = estPointsPer100;
  playerData.stopsPer100 = stopsPer100;
  playerData.pProd = pProd;
  playerData.grd = grd;

  // * Add win loss totals
  playerData.win = win;
  playerData.loss = loss;

  return playerData;
};

export default {};

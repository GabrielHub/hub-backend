import { PlayerData, LeagueData } from '../types';

// * All percentage stats from data are in readable form. They must be converted to decimals before calculations ( / 100)

interface BPM {
  eBPM: number;
  bpm: number;
}

const calculateOffensiveRating = (
  data: PlayerData | LeagueData,
  league3Perc: number,
  leagueUsageRate: number
): number => {
  // * Estimate Points Produced from FG and Ast
  const estimatedAssistedFG = (data.ast * data.fgm) / data.astPerc;
  const pointsFromAssists = 2 * data.ast * (estimatedAssistedFG * (2 * 0.5 * (league3Perc / 100)));
  const pointsFromFG =
    2 * (data.fgm + 0.5 * data.threepm) * (1 - 0.5 * ((data.pts - data.ftm) / (2 * data.fgm)));
  const pointsProduced = pointsFromFG * pointsFromAssists;
  const adjustedPP = pointsProduced * (data.usageRate / leagueUsageRate);

  // * Estimate points lost from negative possessions (missed shots and turnovers)
  const total2P = (data.fgm - data.threepm) * 2;
  const total3P = data.threepm * 3;
  const totalFGA = data.fgm + data.threepm;
  const totalFG = total2P + total3P;
  const averagePointsPerFG = totalFG / totalFGA;
  const pointsLostFromMissedShots = (data.fga - data.fgm) * averagePointsPerFG;

  const pointsLostFromTurnovers = data.tov * averagePointsPerFG;
  const pointsLostFromNegativePoss = pointsLostFromMissedShots + pointsLostFromTurnovers;
  const adjustedPointsLost = pointsLostFromNegativePoss * (data.usageRate / leagueUsageRate);

  const adjustedOffensiveRating = ((adjustedPP - adjustedPointsLost) / data.pace) * 100;
  return adjustedOffensiveRating;
};

const calculateDefensiveRating = (
  data: PlayerData | LeagueData,
  leagueUsageRate: number,
  leaguePace: number,
  leaguePts: number
): number => {
  // * data.pace should really be the opponent's pace, but we don't know this
  // TODO Next year refactor this to include opponent's pace
  const stops =
    data.treb +
    data.stl +
    data.blk +
    (data.oFGA - data.oFGM + data.o3PA - data.o3PM) -
    data.pf * 0.44;

  const averagePointsPerPossession = leaguePts / leaguePace;
  const pointsGainedFromStops = stops * averagePointsPerPossession;
  const adjustedDefensiveStops = pointsGainedFromStops * (data.usageRate / leagueUsageRate);
  const adjustedDefensiveRating = (adjustedDefensiveStops / data.pace) * 100;
  return adjustedDefensiveRating;
};

export const calculateBPM = (playerAverages: PlayerData, leagueAverages: LeagueData): BPM => {
  // * Calculate offensive and defensive ratings for both league and player
  const leagueOffensiveRating = calculateOffensiveRating(
    leagueAverages,
    leagueAverages.threepPerc,
    leagueAverages.usageRate
  );
  const playerOffensiveRating = calculateOffensiveRating(
    playerAverages,
    leagueAverages.threepPerc,
    leagueAverages.usageRate
  );

  const leagueDefensiveRating = calculateDefensiveRating(
    leagueAverages,
    leagueAverages.usageRate,
    leagueAverages.pace,
    leagueAverages.pts
  );
  const playerDefensiveRating = calculateDefensiveRating(
    playerAverages,
    leagueAverages.usageRate,
    leagueAverages.pace,
    leagueAverages.pts
  );

  // * calculate eBPM
  const eBPM =
    playerOffensiveRating -
    leagueOffensiveRating +
    (playerDefensiveRating - leagueDefensiveRating) +
    playerAverages.plusMinus;

  // * League average bpm should always be 0. Normalize eBPM based on this fact
  const bpm = leagueAverages?.eBPM ? eBPM - leagueAverages.eBPM : eBPM;
  return { eBPM, bpm };
};

export default {};

import { PlayerData, LeagueData } from '../types';

const calculateOffensiveRating = (
  data: PlayerData,
  leagueUsageRate: number,
  leaguePTS: number,
  leagueFGM: number
): { adjustedOffensiveRating: number; adjustedPP: number } => {
  // * Player points per FG
  const averagePointsPerFG = data.pts / data.fgm;

  // * League player points per FG
  const averagePointsPerLeagueFG = leaguePTS / leagueFGM;

  // * Estimate Points Produced from FG and Ast
  const pointsFromAssists = data.ast * averagePointsPerLeagueFG;
  const pointsProduced = data.pts + pointsFromAssists;
  const adjustedPP = pointsProduced * (data.usageRate / leagueUsageRate);

  // * Estimate points lost from negative possessions (missed shots and turnovers)
  const pointsLostFromMissedShots = (data.fga - data.fgm) * averagePointsPerFG;

  // * Percentage of possessions that result in an assist
  const percAssist = data.ast / (data.ast + data.fga + data.ftm * 0.44);
  // * Percentage of possessions that result in a field goal attempt
  const percFGA = data.fga / (data.ast + data.fga + data.ftm * 0.44);
  const pointsLostFromTurnovers =
    data.tov * ((averagePointsPerFG * percFGA + averagePointsPerLeagueFG * percAssist) / 2);
  const pointsLostFromNegativePoss = pointsLostFromMissedShots + pointsLostFromTurnovers;
  const adjustedPointsLost = pointsLostFromNegativePoss * (data.usageRate / leagueUsageRate);

  const expectedPoints = adjustedPP - adjustedPointsLost;
  const adjustedOffensiveRating = (expectedPoints / data.pace) * 100;
  return { adjustedOffensiveRating, adjustedPP: pointsProduced };
};

const calculateDefensiveRating = (data: PlayerData, leagueUsageRate: number): number => {
  const o2PA = data.oFGA - data.o3PA;
  const o2PM = data.oFGM - data.o3PM;
  const matchupMisses = o2PA - o2PM + 1.5 * (data.o3PA - data.o3PM);
  const matchupScored = o2PM + 1.5 * data.o3PM;
  const stops = data.treb + data.stl + data.blk + matchupMisses - matchupScored - data.pf * 0.44;

  const adjustedDefensiveStops = stops * (data.usageRate / leagueUsageRate);
  const adjustedDefensiveRating = (adjustedDefensiveStops / data.pace) * 100;
  return adjustedDefensiveRating;
};

export const calculateBPM = (
  playerAverages: PlayerData,
  leagueAverages: LeagueData
): {
  eBPM: number;
  bpm: number;
  estPointsPer100: number;
  stopsPer100: number;
  pProd: number;
} => {
  // * Calculate offensive and defensive ratings for both league and player
  const { adjustedOffensiveRating, adjustedPP } = calculateOffensiveRating(
    playerAverages,
    leagueAverages.usageRate,
    leagueAverages.pts,
    leagueAverages.fgm
  );
  const playerDefensiveRating = calculateDefensiveRating(playerAverages, leagueAverages.usageRate);

  // * calculate eBPM
  const eBPM = adjustedOffensiveRating + playerDefensiveRating + playerAverages.plusMinus;

  // * League average bpm should always be 0. Normalize eBPM based on this fact
  const bpm = leagueAverages?.eBPM ? eBPM - leagueAverages.eBPM : eBPM;
  return {
    eBPM,
    bpm,
    estPointsPer100: adjustedOffensiveRating,
    stopsPer100: playerDefensiveRating,
    pProd: adjustedPP
  };
};

export default {};

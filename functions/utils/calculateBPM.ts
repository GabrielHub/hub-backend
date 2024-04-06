import { PlayerData, LeagueData } from '../types';

const calculateOffensiveRating = (
  data: PlayerData,
  leagueUsageRate: number,
  leagueFGM: number,
  leagueFGA: number,
  league3PM: number
): { adjustedOffensiveRating: number; adjustedPP: number } => {
  // * Player points per FG
  const total2P = (data.fgm - data.threepm) * 2;
  const total3P = data.threepm * 3;
  const totalFG = total2P + total3P;
  const averagePointsPerFG = totalFG / data.fga;

  // * League player points per FG
  const totalLeague2P = (leagueFGM - league3PM) * 2;
  const totalLeague3P = league3PM * 3;
  const totalLeagueFG = totalLeague2P + totalLeague3P;
  const averagePointsPerLeagueFG = totalLeagueFG / leagueFGA;

  // * Estimate Points Produced from FG and Ast
  const pointsFromAssists = data.ast * averagePointsPerLeagueFG;
  const pointsProduced = averagePointsPerFG + pointsFromAssists + data.ftm;
  const adjustedPP = pointsProduced * (data.usageRate / leagueUsageRate);

  // * Estimate points lost from negative possessions (missed shots and turnovers)
  const pointsLostFromMissedShots = (data.fga - data.fgm) * averagePointsPerFG;

  const pointsLostFromTurnovers = data.tov * ((averagePointsPerFG + averagePointsPerLeagueFG) / 2);
  const pointsLostFromNegativePoss = pointsLostFromMissedShots + pointsLostFromTurnovers;
  const adjustedPointsLost = pointsLostFromNegativePoss * (data.usageRate / leagueUsageRate);

  const expectedPoints = adjustedPP - adjustedPointsLost;
  const adjustedOffensiveRating = (expectedPoints / data.pace) * 100;
  return { adjustedOffensiveRating, adjustedPP };
};

const calculateDefensiveRating = (data: PlayerData, leagueUsageRate: number): number => {
  // * data.pace should really be the opponent's pace, but we don't know this
  // TODO Next year refactor this to include opponent's pace
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
    leagueAverages.fgm,
    leagueAverages.fga,
    leagueAverages.threepm
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

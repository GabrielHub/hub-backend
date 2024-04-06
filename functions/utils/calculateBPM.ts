import { PlayerData, LeagueData } from '../types';

// * All percentage stats from data are in readable form. They must be converted to decimals before calculations ( / 100)
interface BPM {
  eBPM: number;
  bpm: number;
  bOffense: number;
  bDefense: number;
}

const calculateOffensiveRating = (
  data: PlayerData,
  leagueUsageRate: number,
  leagueFGM: number,
  leagueFGA: number,
  league3PM: number
): number => {
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

  const adjustedOffensiveRating = ((adjustedPP - adjustedPointsLost) / data.pace) * 100;
  return adjustedOffensiveRating;
};

const calculateDefensiveRating = (data: PlayerData, leagueUsageRate: number): number => {
  // * data.pace should really be the opponent's pace, but we don't know this
  // TODO Next year refactor this to include opponent's pace
  const o2PA = data.oFGA - data.o3PA;
  const o2PM = data.oFGM - data.o3PM;
  const stops =
    data.treb +
    data.stl +
    data.blk +
    (2 * (o2PA - o2PM) + 3 * (data.o3PA - data.o3PM)) -
    (2 * o2PM + 3 * data.o3PM) -
    data.pf * 0.44;

  const pointsGainedFromStops = stops;
  const adjustedDefensiveStops = pointsGainedFromStops * (data.usageRate / leagueUsageRate);
  const adjustedDefensiveRating = (adjustedDefensiveStops / data.pace) * 100;
  return adjustedDefensiveRating;
};

export const calculateBPM = (playerAverages: PlayerData, leagueAverages: LeagueData): BPM => {
  // * Calculate offensive and defensive ratings for both league and player
  const playerOffensiveRating = calculateOffensiveRating(
    playerAverages,
    leagueAverages.usageRate,
    leagueAverages.fgm,
    leagueAverages.fga,
    leagueAverages.threepm
  );
  const playerDefensiveRating = calculateDefensiveRating(playerAverages, leagueAverages.usageRate);

  // * calculate eBPM
  const eBPM = playerOffensiveRating + playerDefensiveRating + playerAverages.plusMinus;

  // * League average bpm should always be 0. Normalize eBPM based on this fact
  const bpm = leagueAverages?.eBPM ? eBPM - leagueAverages.eBPM : eBPM;
  return { eBPM, bpm, bOffense: playerOffensiveRating, bDefense: playerDefensiveRating };
};

export default {};

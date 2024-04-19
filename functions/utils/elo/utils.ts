import { INITIAL_ELO } from '../../constants';
import { C, K } from './constants';
import { RawPlayerData } from '../../types';

const expectedResult = (ratingA: number, ratingB: number): number => {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / C));
};

const actualResult = (playerA: number, playerB: number): number => {
  if (playerA > playerB) {
    return 1;
  }
  if (playerA < playerB) {
    return 0;
  }
  return 0.5;
};

const qValue = (elow: number, elol: number): number => {
  return 2.2 / ((elow - elol) * 0.001 + 2.2);
};

const marginOfVictory = (
  teamPoints: { 1: number; 2: number },
  teamRatings: { 1: number; 2: number },
  playerAPts: number,
  playerBPts: number
): number => {
  const winningTeam = teamPoints[1] > teamPoints[2] ? 1 : 2;
  const losingTeam = winningTeam === 1 ? 2 : 1;
  return (
    Math.log(Math.abs(playerAPts - playerBPts) + 1) *
    qValue(teamRatings[winningTeam], teamRatings[losingTeam])
  );
};

export const calculateGameScore = (player: RawPlayerData): number => {
  const gameScore =
    player.pts +
    0.4 * player.fgm -
    0.7 * player.fga -
    0.5 * player.treb +
    player.stl +
    0.7 * player.ast +
    0.7 * player.blk -
    0.4 * player.pf -
    player.tov;

  return gameScore;
};

export const calculateNewElo = (
  currentRating: number,
  playerMap: Map<string, number>,
  teamPoints: { 1: number; 2: number },
  teamRatings: { 1: number; 2: number },
  playerData: RawPlayerData,
  opponents: RawPlayerData[]
): number => {
  if (!playerData.eloComparisonValue || !playerData.uid) return currentRating;

  const sumOfComparisons = opponents.reduce((acc, opponent) => {
    if (!opponent.eloComparisonValue || !opponent.uid || !playerData.eloComparisonValue) {
      return acc;
    }
    const opponentRating = playerMap.get(opponent.uid) || INITIAL_ELO;
    const expected = expectedResult(currentRating, opponentRating);
    const movm = marginOfVictory(
      teamPoints,
      teamRatings,
      playerData.eloComparisonValue,
      opponent.eloComparisonValue
    );
    const actual = actualResult(playerData.eloComparisonValue, opponent.eloComparisonValue);
    return acc + K * (actual - expected) * movm;
  }, 0);
  return currentRating + sumOfComparisons;
};

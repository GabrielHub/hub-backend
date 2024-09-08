import admin from 'firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { error, log } from 'firebase-functions/logger';
import { INITIAL_ELO } from '../../constants';
import { PlayerData, RawPlayerData, RawTeamData } from '../../types';
import { calculateGameScore, calculateNewElo } from '../../utils/elo';

export const addEloAfterUpload = async (snapshot: QueryDocumentSnapshot) => {
  log('addEloAfterUpload', snapshot?.id);
  const data = snapshot.data();
  const playerBoxScoreData = (data?.rawPlayerData || data?.playerData) as RawPlayerData[];
  const teamBoxScoreData = (data?.rawTeamData || data?.teamData) as RawTeamData[];

  // * Raw player data must be lowercased and searched for in the player collection
  const playerIds = playerBoxScoreData.map((player) => player.playerID).filter(Boolean);
  const db = admin.firestore();
  try {
    const playerSnapshot = await db
      .collection('players')
      .where(admin.firestore.FieldPath.documentId(), 'in', playerIds)
      .get();

    const playerEloMap = new Map<string, number>();
    playerSnapshot.forEach((doc) => {
      const playerData = doc.data() as PlayerData;
      playerEloMap.set(doc.id, playerData?.elo ?? INITIAL_ELO);
    });

    if (!teamBoxScoreData?.[1]?.pts || !teamBoxScoreData?.[2]?.pts) {
      throw new Error('Team data not found in game data, cannot calculate Elo');
    }

    const teamPoints = {
      1: teamBoxScoreData[1].pts,
      2: teamBoxScoreData[2].pts
    };
    const teamEloRatings = {
      1: 0,
      2: 0
    };

    playerBoxScoreData.forEach((player) => {
      if (!player.playerID) {
        error('Player ID not found', player.name);
        return;
      }
      player.eloComparisonValue = calculateGameScore(player) + teamPoints[player.team];
      teamEloRatings[player.team] += player.eloComparisonValue;
    });

    playerBoxScoreData.forEach((player) => {
      if (player.isAI || !player.eloComparisonValue || !player.playerID) {
        return;
      }
      const currentElo = playerEloMap.get(player.playerID);
      if (!currentElo) {
        error('Player id not found in list of players', player.playerID);
        return;
      }
      const opponents = playerBoxScoreData.filter(
        (opp) => !opp.isAI && opp.playerID !== player.playerID
      );
      const newElo = calculateNewElo(
        currentElo,
        playerEloMap,
        teamPoints,
        teamEloRatings,
        player,
        opponents
      );
      playerEloMap.set(player.playerID, newElo);
    });

    const batch = db.batch();
    playerEloMap.forEach((elo, playerID) => {
      const playerRef = db.collection('players').doc(playerID);
      batch.update(playerRef, { elo });
    });
    await batch.commit();
  } catch (err) {
    error('Error adding elo after upload', err);
  }
};

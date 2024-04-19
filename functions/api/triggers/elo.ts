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
  const rawPlayerNames = playerBoxScoreData.map((player) => player.name.trim().toLowerCase());
  const db = admin.firestore();
  try {
    const playerSnapshot = await db
      .collection('players')
      .where('alias', 'array-contains-any', rawPlayerNames)
      .get();

    const playerEloMap = new Map<string, number>();
    const playerAliasMap = new Map<string, string>();
    playerSnapshot.forEach((doc) => {
      const playerData = doc.data() as PlayerData;
      playerEloMap.set(doc.id, playerData?.elo ?? INITIAL_ELO);
      playerData.alias.forEach((alias) => {
        playerAliasMap.set(alias, doc.id);
      });
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
      const playerUID = playerAliasMap.get(player.name.trim().toLowerCase());
      if (!playerUID) {
        error('Player name not found in list of player ids', player.name);
        return;
      }
      player.eloComparisonValue = calculateGameScore(player) + teamPoints[player.team];
      player.uid = playerUID;
      teamEloRatings[player.team] += player.eloComparisonValue;
    });

    playerBoxScoreData.forEach((player) => {
      if (player.isAI || !player.eloComparisonValue || !player.uid) {
        return;
      }
      const currentElo = playerEloMap.get(player.uid);
      if (!currentElo) {
        error('Player id not found in list of players', player.uid);
        return;
      }
      const opponents = playerBoxScoreData.filter((opp) => !opp.isAI && opp.uid !== player.uid);
      const newElo = calculateNewElo(
        currentElo,
        playerEloMap,
        teamPoints,
        teamEloRatings,
        player,
        opponents
      );
      playerEloMap.set(player.uid, newElo);
    });

    const batch = db.batch();
    playerEloMap.forEach((elo, uid) => {
      const playerRef = db.collection('players').doc(uid);
      batch.update(playerRef, { elo });
    });
    await batch.commit();
  } catch (err) {
    error('Error adding elo after upload', err);
  }
};

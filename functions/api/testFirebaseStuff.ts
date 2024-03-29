import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { PlayerData } from '../types';

interface iPlayerData extends PlayerData {
  id: string;
  topPositions?: string[] | number[];
}

// * Just using this to test some stuff I don't want to set up the firestore emulator for
const testFirebaseStuff = async (req: Request, res: Response): Promise<void> => {
  const db = admin.firestore();
  const querySnapshot = await db.collection('players').get();
  const rawPlayerList: iPlayerData[] = [];
  querySnapshot.docs.forEach((doc) => {
    const playerData = doc.data() as PlayerData;
    if (playerData?.gp > 1) {
      const player: iPlayerData = { ...playerData, id: doc.id };
      rawPlayerList.push(player);
    }
  });

  // * Set the two most played positions for each player as the topPositions array
  rawPlayerList.forEach((player) => {
    const sortedPositions = Object.entries(player.positions || {})
      .sort(([, a], [, b]) => b - a)
      .map(([key]) => key);
    player.topPositions = [sortedPositions[0], sortedPositions[1]];
  });

  const playerList = rawPlayerList.sort((a, b) => b.aPER - a.aPER);
  const minGamesPlayerList = playerList
    .filter((player) => player.gp >= 25)
    .map((player) => ({
      name: player.name,
      gp: player.gp
    }));

  const allNBAFirstTeam = minGamesPlayerList.slice(0, 5);
  const allNBASecondTeam = minGamesPlayerList.slice(5, 10);

  console.log(JSON.stringify(allNBAFirstTeam, null, 2));
  console.log(JSON.stringify(allNBASecondTeam, null, 2));

  res.status(200);
};

export default testFirebaseStuff;

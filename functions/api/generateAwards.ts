import { Request, Response } from 'express';
import { log, error } from 'firebase-functions/logger';
import admin from 'firebase-admin';
import dayjs from 'dayjs';
import { PlayerData, Award } from '../types';

interface iPlayerData extends PlayerData {
  id: string;
  topPositions?: string[] | number[];
}

export const generateAwards = async (req: Request, res: Response) => {
  try {
    log('Generating awards');

    const db = admin.firestore();
    const querySnapshot = await db.collection('players').get();
    const playerList: iPlayerData[] = [];
    querySnapshot.docs.forEach((doc) => {
      const playerData = doc.data() as PlayerData;
      if (playerData?.gp > 1) {
        const player: iPlayerData = { ...playerData, id: doc.id };
        playerList.push(player);
      }
    });

    // * Set the two most played positions for each player as the topPositions array
    playerList.forEach((player) => {
      const sortedPositions = Object.entries(player.positions || {})
        .sort(([, a], [, b]) => b - a)
        .map(([key]) => key);
      player.topPositions = [sortedPositions[0], sortedPositions[1]];
    });

    // * Get the poaDefender sub collection for each player, and the document with the id lock from that sub collection
    // * if the lock document does not exist, skip this player
    const poaDefenders: iPlayerData[] = [];
    for (const doc of querySnapshot.docs) {
      const playerID = doc.id;
      const poaDefender = await db
        .collection('players')
        .doc(playerID)
        .collection('poaDefender')
        .doc('lock')
        .get()
        .then((doc) => {
          if (!doc.exists) return null;
          if (doc.data()?.gp < 2) return null;
          return doc.data() as PlayerData;
        });
      if (poaDefender) {
        poaDefenders.push({ ...poaDefender, id: playerID });
      }
    }

    log(
      'Locks collected',
      poaDefenders.map((player) => player.name)
    );

    // * MVP is the player with the highest PER with a minimum of 25 games played
    const mvp = playerList.reduce((prev, current) => {
      if (prev.aPER && current.aPER && current.gp >= 25) {
        return prev.aPER > current.aPER ? prev : current;
      }
      return prev;
    }, playerList[0]);

    // * DPOY is the player with the lowest drtg with a minimum of 25 games played
    const dpoy = playerList.reduce((prev, current) => {
      if (current.drtg && current.gp >= 25) {
        return prev.drtg < current.drtg ? prev : current;
      }
      return prev;
    }, playerList[0]);

    // * POA Defender is the player with the lowest drtg in their lock sub collection with a minimum of 25 games played
    const poaDefender = poaDefenders.reduce((prev, current) => {
      if (current.drtg && current.gp >= 25) {
        return prev.drtg < current.drtg ? prev : current;
      }
      return prev;
    }, poaDefenders[0]);

    // * Best shooter is the player with the highest 3P% weighted 40/40/20 with 3PA and high three point attempt rate, min 82 3PA
    const bestShooter = playerList.reduce((prev, current) => {
      if (
        current.threePerc &&
        current.threepAR &&
        prev.threePerc &&
        current.threepa * current.gp >= 82
      ) {
        const prevWeighted = prev.threePerc * 0.4 + prev.threepAR * 0.2 + prev.threepa * 0.4;
        const currentWeighted =
          current.threePerc * 0.4 + current.threepAR * 0.2 + current.threepa * 0.4;
        return prevWeighted > currentWeighted ? prev : current;
      }
      return prev;
    }, playerList[0]);

    // * Worst shooter is the player with the lowest 3P% weighted 80/20 with three point attempt rate, min 82 3PA
    const worstShooter = playerList.reduce((prev, current) => {
      if (
        current.threePerc &&
        prev.threePerc &&
        current.threepAR &&
        current.threepa * current.gp >= 82
      ) {
        const prevWeighted = prev.threePerc * 0.8 + prev.threepAR * 0.2;
        const currentWeighted = current.threePerc * 0.8 + current.threepAR * 0.2;
        return prevWeighted < currentWeighted ? prev : current;
      }
      return prev;
    }, playerList[0]);

    // * Most active player is the player with the most games played
    const mostActive = playerList.reduce((prev, current) => {
      return prev.gp > current.gp ? prev : current;
    }, playerList[0]);

    // * Most used player is the player with the highest USG%, min 25 games
    const mostUsed = playerList.reduce((prev, current) => {
      if (prev.usageRate && current.usageRate && current.gp >= 25) {
        return prev.usageRate > current.usageRate ? prev : current;
      }
      return prev;
    }, playerList[0]);

    // * Least used player is the player with the lowest USG%, min 25 games
    const leastUsed = playerList.reduce((prev, current) => {
      if (current.gp && current.gp >= 25) {
        return prev.usageRate < current.usageRate ? prev : current;
      }
      return prev;
    }, playerList[0]);

    // * Most efficient player is the player with the highest EFG%, min 300 FGA
    const mostEfficient = playerList.reduce((prev, current) => {
      if (prev.efgPerc && current.efgPerc && current.fga * current.gp >= 300) {
        return prev.efgPerc > current.efgPerc ? prev : current;
      }
      return prev;
    }, playerList[0]);

    // * Least efficient player is the player with the lowest EFG%, min 300 FGA
    const leastEfficient = playerList.reduce((prev, current) => {
      if (prev.efgPerc && current.efgPerc && current.fga * current.gp >= 300) {
        return prev.efgPerc < current.efgPerc ? prev : current;
      }
      return prev;
    }, playerList[0]);

    // * Shot chucker is the player with the lowest EFG% weighted 50/50 with high FGA, min 300 FGA
    const shotChucker = playerList.reduce((prev, current) => {
      if (prev.efgPerc && current.efgPerc && current.fga * current.gp >= 300) {
        const prevWeighted = prev.efgPerc * 0.5 + prev.fga * 0.5;
        const currentWeighted = current.efgPerc * 0.5 + current.fga * 0.5;
        return prevWeighted < currentWeighted ? prev : current;
      }
      return prev;
    }, playerList[0]);

    // * Fastbreak player is the player with the highest pace weighted 80/20 with FGA, min 25 games
    const fastbreakPlayer = playerList.reduce((prev, current) => {
      if (prev.gp && current.gp && current.gp >= 25) {
        const prevWeighted = prev.pace * 0.8 + prev.fga * 0.2;
        const currentWeighted = current.pace * 0.8 + current.fga * 0.2;
        return prevWeighted > currentWeighted ? prev : current;
      }
      return prev;
    }, playerList[0]);

    // * Most attacked player is the player with the most OFGA, min 300 OFGA
    const mostAttacked = playerList.reduce((prev, current) => {
      if (prev.oFGA && current.oFGA && current.oFGA * current.gp >= 300) {
        return prev.oFGA > current.oFGA ? prev : current;
      }
      return prev;
    }, playerList[0]);

    // * Best intimidator is the player with the lowest OFG% weighted 50/50 with OFGA, min 300 OFGA
    const bestIntimidator = playerList.reduce((prev, current) => {
      if (prev.oEFGPerc && current.oEFGPerc && current.oFGA && current.oFGA * current.gp >= 300) {
        const prevWeighted = prev.oEFGPerc * 0.5 + prev.oFGA * 0.5;
        const currentWeighted = current.oEFGPerc * 0.5 + current.oFGA * 0.5;
        return prevWeighted < currentWeighted ? prev : current;
      }
      return prev;
    }, playerList[0]);

    // * All NBA First team is the top 5 players with the highest PER, min 25 games
    const sortedPlayers = playerList
      .filter((player) => player.gp && player.gp >= 25)
      .sort((a, b) => b.aPER - a.aPER);
    const allNBAFirst = sortedPlayers.slice(0, 5);

    // * All NBA Second team is the top 5 players with the highest PER after allNBAFirst, min 25 games
    const allNBASecond = sortedPlayers.slice(5, 10);

    const awards: Award = {
      mvp: { id: mvp.id, name: mvp.name, value: mvp.aPER, positions: mvp.topPositions },
      dpoy: { id: dpoy.id, name: dpoy.name, value: dpoy.drtg, positions: dpoy.topPositions },
      poaDefender: { id: poaDefender.id, name: poaDefender.name, value: poaDefender.drtg },
      bestShooter: {
        id: bestShooter.id,
        name: bestShooter.name,
        value: `${bestShooter.threePerc} ${bestShooter.threepa} ${bestShooter.threepAR}`,
        positions: bestShooter.topPositions
      },
      worstShooter: {
        id: worstShooter.id,
        name: worstShooter.name,
        value: `${worstShooter.threePerc} ${worstShooter.threepAR}`,
        positions: worstShooter.topPositions
      },
      mostActive: {
        id: mostActive.id,
        name: mostActive.name,
        value: mostActive?.gp || 0,
        positions: mostActive.topPositions
      },
      mostUsed: {
        id: mostUsed.id,
        name: mostUsed.name,
        value: mostUsed.usageRate,
        positions: mostUsed.topPositions
      },
      leastUsed: {
        id: leastUsed.id,
        name: leastUsed.name,
        value: leastUsed.usageRate,
        positions: leastUsed.topPositions
      },
      mostEfficient: {
        id: mostEfficient.id,
        name: mostEfficient.name,
        value: mostEfficient?.efgPerc || 0,
        positions: mostEfficient.topPositions
      },
      leastEfficient: {
        id: leastEfficient.id,
        name: leastEfficient.name,
        value: leastEfficient?.efgPerc || 0,
        positions: leastEfficient.topPositions
      },
      shotChucker: {
        id: shotChucker.id,
        name: shotChucker.name,
        value: `${shotChucker?.efgPerc} ${shotChucker.fga}`,
        positions: shotChucker.topPositions
      },
      fastbreakPlayer: {
        id: fastbreakPlayer.id,
        name: fastbreakPlayer.name,
        value: `${fastbreakPlayer.pace} ${fastbreakPlayer.fga}`,
        positions: fastbreakPlayer.topPositions
      },
      mostAttacked: {
        id: mostAttacked.id,
        name: mostAttacked.name,
        value: mostAttacked.oFGA,
        positions: mostAttacked.topPositions
      },
      bestIntimidator: {
        id: bestIntimidator.id,
        name: bestIntimidator.name,
        value: `${bestIntimidator.oEFGPerc} ${bestIntimidator.oFGA}`,
        positions: bestIntimidator.topPositions
      },
      allNBAFirst: allNBAFirst.map((player) => ({
        id: player.id,
        name: player.name,
        value: Math.floor(player.rating),
        positions: player.topPositions
      })),
      allNBASecond: allNBASecond.map((player) => ({
        id: player.id,
        name: player.name,
        value: Math.floor(player.rating),
        positions: player.topPositions
      }))
    };

    log('Awards generated', awards);
    // * add awards to the awards collection, with a firestore timestamp on the _createdAt and createdAt fields
    // * Generate a uid for the document
    await db
      .collection('awards')
      .doc()
      .set({
        ...awards,
        _createdAt: admin.firestore.Timestamp.now(),
        createdAt: dayjs().format()
      });

    return res.status(200).send('Awards generated');
  } catch (err) {
    error('Error generating awards', err);
    return res.status(500).send('Error generating awards');
  }
};

export default {};

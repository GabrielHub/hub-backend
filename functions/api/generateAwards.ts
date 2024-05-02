import { Request, Response } from 'express';
import { log, error } from 'firebase-functions/logger';
import admin from 'firebase-admin';
import dayjs from 'dayjs';
import { PlayerData, Award } from '../types';
import { roundForReadable } from '../utils';

interface iPlayerData extends PlayerData {
  id: string;
  topPositions?: string[] | number[];
}

export const generateAwards = async (req: Request, res: Response) => {
  try {
    log('Generating awards');

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
    const minGamesPlayerList = playerList.filter((player) => player.gp >= 25);
    const minFGAPlayerList = playerList.filter((player) => player.fga * player.gp >= 300);
    const min3PAPlayerList = playerList.filter((player) => player.threepa * player.gp >= 82);

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
    const mvp = minGamesPlayerList?.[0];

    // * DPOY is the player with the lowest drtg with a minimum of 25 games played
    const dpoy = minGamesPlayerList.reduce((prev, current) => {
      if (current.drtg && current.gp >= 25) {
        return prev.drtg < current.drtg ? prev : current;
      }
      return prev;
    }, minGamesPlayerList[0]);

    // * POA Defender is the player with the lowest drtg in their lock sub collection with a minimum of 25 games played
    const poaDefender = poaDefenders.reduce((prev, current) => {
      if (current.drtg && current.gp >= 25) {
        return prev.drtg < current.drtg ? prev : current;
      }
      return prev;
    }, poaDefenders[0]);

    // * Best shooter is the player with the highest 3P% weighted 40/40/20 with 3PA and high three point attempt rate, min 82 3PA
    const bestShooter = min3PAPlayerList.reduce((prev, current) => {
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
    }, min3PAPlayerList[0]);

    // * Worst shooter is the player with the lowest 3P%:3PaR ratio, min 82 3PA
    const worstShooter = min3PAPlayerList.reduce((prev, current) => {
      if (prev.threePerc && current.threePerc && current.threepa * current.gp >= 82) {
        const prevRatio = prev.threePerc / prev.threepAR;
        const currentRatio = current.threePerc / current.threepAR;
        return prevRatio < currentRatio ? prev : current;
      }
      return prev;
    }, min3PAPlayerList[0]);

    // * Most active player is the player with the most games played
    const mostActive = minGamesPlayerList.reduce((prev, current) => {
      return prev.gp > current.gp ? prev : current;
    }, minGamesPlayerList[0]);

    // * Ballhog award is the player with the lowest (AST%/USG%) value, min 25 games
    const ballHog = minGamesPlayerList.reduce((prev, current) => {
      if (prev.astPerc && current.astPerc && current.gp >= 25) {
        return prev.astPerc / prev.usageRate < current.astPerc / current.usageRate ? prev : current;
      }
      return prev;
    }, minGamesPlayerList[0]);

    // * Best Passer is the player with the highest AST%/USG% - TOV%/USG%, min 25 games
    const bestPlaymaker = minGamesPlayerList.reduce((prev, current) => {
      if (prev.astPerc && current.astPerc && current.gp >= 25) {
        const prevValue = prev.astPerc / prev.usageRate - prev.tovPerc / prev.usageRate;
        const currentValue =
          current.astPerc / current.usageRate - current.tovPerc / current.usageRate;
        return prevValue > currentValue ? prev : current;
      }
      return prev;
    }, minGamesPlayerList[0]);

    // * Most efficient player is the player with the highest (EFG% * astToRatio) value, min 300 FGA
    const mostEfficient = minFGAPlayerList.reduce((prev, current) => {
      if (prev.efgPerc && current.efgPerc && current.fga * current.gp >= 300) {
        return prev.efgPerc * prev.astToRatio > current.efgPerc * current.astToRatio
          ? prev
          : current;
      }
      return prev;
    }, minFGAPlayerList[0]);

    // * Least efficient player is the player with the lowest EFG% * astToRatio, min 300 FGA
    const leastEfficient = minFGAPlayerList.reduce((prev, current) => {
      if (prev.efgPerc && current.efgPerc && current.fga * current.gp >= 300) {
        return prev.efgPerc * prev.astToRatio < current.efgPerc * current.astToRatio
          ? prev
          : current;
      }
      return prev;
    }, minFGAPlayerList[0]);

    // * Shot chucker is the player with the lowest EFG, min 300 FGA and 10 FGA per game
    const shotChucker = minFGAPlayerList.reduce((prev, current) => {
      if (prev.efgPerc && current.efgPerc && current.fga * current.gp >= 300 && current.fga > 9) {
        return prev.efgPerc < current.efgPerc ? prev : current;
      }
      return prev;
    }, minFGAPlayerList[0]);

    // * Fastbreak player is the player with the highest pace to (1 - USG%/100) ratio, min 25 games
    const fastbreakPlayer = minGamesPlayerList.reduce((prev, current) => {
      if (prev.pace && current.pace && current.gp >= 25) {
        return prev.pace / (1 - prev.usageRate / 100) < current.pace / (1 - current.usageRate / 100)
          ? prev
          : current;
      }
      return prev;
    }, minGamesPlayerList[0]);

    // * Best intimidator is the player with the lowest OFG%/(blk) ratio, min 300 OFGA
    const bestIntimidator = minFGAPlayerList.reduce((prev, current) => {
      if (prev.oEFGPerc && current.oEFGPerc && current.oFGA * current.gp >= 300) {
        return prev.oEFGPerc / prev.blk < current.oEFGPerc / current.blk ? prev : current;
      }
      return prev;
    }, minFGAPlayerList[0]);

    // * Best TwoWay is the player with the highest (ortg/(1-usageRate) - (2 * drtg)), min 25 games
    const bestTwoWay = minGamesPlayerList.reduce((prev, current) => {
      if (prev.ortg && prev.drtg && current.ortg && current.drtg && current.gp >= 25) {
        const prevValue = prev.ortg / (1 - prev.usageRate / 100) - 2 * prev.drtg;
        const currentValue = current.ortg / (1 - current.usageRate / 100) - 2 * current.drtg;

        return prevValue > currentValue ? prev : current;
      }
      return prev;
    }, minGamesPlayerList[0]);

    // * Turnover Machine is the player with the highest TOV% weighted 50% with TOV, min 25 games
    const turnoverMachine = minGamesPlayerList.reduce((prev, current) => {
      if (prev.tovPerc && current.tovPerc && current.gp >= 25) {
        const prevWeighted = prev.tovPerc * 0.5 + prev.tov;
        const currentWeighted = current.tovPerc * 0.5 + current.tov;
        return prevWeighted > currentWeighted ? prev : current;
      }
      return prev;
    }, minGamesPlayerList[0]);

    // * All NBA First team is the top 5 players with the highest PER, min 25 games
    const allNBAFirst = minGamesPlayerList.slice(0, 5);

    // * All NBA Second team is the top 5 players with the highest PER after allNBAFirst, min 25 games
    const allNBASecond = minGamesPlayerList.slice(5, 10);

    // * All Defense First team is the top 5 players with the lowest drtg, min 25 games
    const allDefenseFirst = minGamesPlayerList.sort((a, b) => a.drtg - b.drtg).slice(0, 5);

    const awards: Award = {
      mvp: {
        id: mvp.id,
        name: mvp.name,
        value: roundForReadable(mvp.PER),
        positions: mvp.topPositions
      },
      dpoy: {
        id: dpoy.id,
        name: dpoy.name,
        value: roundForReadable(dpoy.drtg),
        positions: dpoy.topPositions
      },
      poaDefender: {
        id: poaDefender.id,
        name: poaDefender.name,
        value: roundForReadable(poaDefender.drtg)
      },
      bestShooter: {
        id: bestShooter.id,
        name: bestShooter.name,
        value: `${roundForReadable(bestShooter.threePerc)} ${roundForReadable(bestShooter.threepa)} ${roundForReadable(bestShooter.threepAR)}`,
        positions: bestShooter.topPositions
      },
      worstShooter: {
        id: worstShooter.id,
        name: worstShooter.name,
        value: `${roundForReadable(worstShooter.threePerc)} ${roundForReadable(worstShooter.threepAR)}`,
        positions: worstShooter.topPositions
      },
      mostActive: {
        id: mostActive.id,
        name: mostActive.name,
        value: mostActive?.gp || 0,
        positions: mostActive.topPositions
      },
      mostEfficient: {
        id: mostEfficient.id,
        name: mostEfficient.name,
        value: `${roundForReadable(mostEfficient.efgPerc)} ${roundForReadable(mostEfficient.astToRatio)}`,
        positions: mostEfficient.topPositions
      },
      leastEfficient: {
        id: leastEfficient.id,
        name: leastEfficient.name,
        value: `${roundForReadable(leastEfficient.efgPerc)} ${roundForReadable(leastEfficient.astToRatio)}`,
        positions: leastEfficient.topPositions
      },
      shotChucker: {
        id: shotChucker.id,
        name: shotChucker.name,
        value: `${roundForReadable(shotChucker?.efgPerc)} ${roundForReadable(shotChucker.fga)}`,
        positions: shotChucker.topPositions
      },
      fastbreakPlayer: {
        id: fastbreakPlayer.id,
        name: fastbreakPlayer.name,
        value: `${roundForReadable(fastbreakPlayer.pace)} ${roundForReadable(fastbreakPlayer.fga)}`,
        positions: fastbreakPlayer.topPositions
      },
      bestIntimidator: {
        id: bestIntimidator.id,
        name: bestIntimidator.name,
        value: `${roundForReadable(bestIntimidator.oEFGPerc)} ${roundForReadable(bestIntimidator.oFGA)} ${roundForReadable(bestIntimidator.blk)}`,
        positions: bestIntimidator.topPositions
      },
      bestPasser: {
        id: bestPlaymaker.id,
        name: bestPlaymaker.name,
        value: `${roundForReadable(bestPlaymaker.ast)} ${roundForReadable(bestPlaymaker.tov)} ${roundForReadable(bestPlaymaker.usageRate)}`,
        positions: bestPlaymaker.topPositions
      },
      ballHog: {
        id: ballHog.id,
        name: ballHog.name,
        value: `${roundForReadable(ballHog.astPerc)} ${roundForReadable(ballHog.usageRate)}`,
        positions: ballHog.topPositions
      },
      bestTwoWay: {
        id: bestTwoWay.id,
        name: bestTwoWay.name,
        value: `${roundForReadable(bestTwoWay.ortg)} ${roundForReadable(bestTwoWay.drtg)} ${roundForReadable(bestTwoWay.usageRate)}`,
        positions: bestTwoWay.topPositions
      },
      allNBAFirst: allNBAFirst.map((player) => ({
        id: player.id,
        name: player.name,
        value: player.rating,
        positions: player.topPositions
      })),
      turnoverMachine: {
        id: turnoverMachine.id,
        name: turnoverMachine.name,
        value: `${roundForReadable(turnoverMachine.tovPerc)} ${roundForReadable(turnoverMachine.tov)}`,
        positions: turnoverMachine.topPositions
      },
      allNBASecond: allNBASecond.map((player) => ({
        id: player.id,
        name: player.name,
        value: player.rating,
        positions: player.topPositions
      })),
      allDefensiveFirst: allDefenseFirst.map((player) => ({
        id: player.id,
        name: player.name,
        value: player.drtg,
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

import admin from 'firebase-admin';
import { log, warn, error } from 'firebase-functions/logger';
import { Request, Response } from 'express';
import _ from 'lodash';
import {
  calculateAPER,
  calculateAdvancedDefensiveStats,
  calculateAdvancedOffensiveStats,
  calculateDoubles,
  calculateTwoPointers,
  getExpectedORebounds,
  getLeagueData
} from '../utils';
import { Audit, RawPlayerData, RawTeamData, TotalRawTeamData } from '../types';
import { addAudit } from '../utils/addAudit';
import { returnAuthToken } from '../src/auth';

// ? Used to estimate OREB
const FG_OREB_PERC = 0.22;
const THREEP_OREB_PERC = 0.28;

const uploadStats = async (req: Request, res: Response): Promise<void> => {
  const { rawTeamData: uploadRawTeamData, rawPlayerData: uploadRawPlayerData } = req.body;

  const rawTeamData: TotalRawTeamData = uploadRawTeamData;
  const rawPlayerData: RawPlayerData[] = uploadRawPlayerData;

  if (!rawTeamData || !rawPlayerData) {
    warn('Upload: Invalid data');
    res.status(401).send('Invalid data');
  }

  const formattedTeamData = {};
  const teamReboundData = {};
  const playerReboundData = {};

  log('uploadStats', rawTeamData, rawPlayerData);
  const db = admin.firestore();

  // * Store upload team and player data
  const uploadRef = db.collection('uploads').doc();
  const uploadId = uploadRef.id;
  await uploadRef.set({
    teamData: rawTeamData,
    playerData: rawPlayerData,
    _createdAt: admin.firestore.Timestamp.now()
  });

  // * Fetch league data for PER
  const league = await getLeagueData();

  // * Calculate oreb for both teams first (estimations) then set basic stats
  Object.keys(rawTeamData).forEach((teamKey) => {
    const teamData = rawTeamData[teamKey];
    const { treb, fgm, fga, threepm, threepa } = teamData;
    const missed3P = threepa - threepm;
    const missed2P = fga - fgm - missed3P;

    // * Estimate OREB
    const expected = Math.floor(missed3P * THREEP_OREB_PERC + missed2P * FG_OREB_PERC);
    const oreb = getExpectedORebounds(treb, expected);
    const dreb = Math.abs(treb - oreb);

    teamReboundData[teamKey] = {
      dreb,
      oreb
    };
  });

  Object.keys(rawTeamData).forEach((stringTeamKey) => {
    const teamKey = parseInt(stringTeamKey, 10);
    const mp = 100; // * Each games is 20 minutes so total minutes is always 100

    // * Load image recognized stats first
    // * Destructure stats that we'll use for calculations and readability
    const { [teamKey]: teamData, ...rest } = rawTeamData;
    const opponent: RawTeamData = Object.values(rest)[0];
    if (!opponent) {
      warn('No opponent found. Invalid request');
      res.status(400).send('No opponent found. Invalid request');
    }

    const { treb, tov, fgm, fga, threepm, threepa, ftm, fta } = teamData;

    const { twopa, twopm } = calculateTwoPointers(fga, fgm, threepa, threepm);

    const { dreb, oreb } = teamReboundData[teamKey];
    const ORBPerc = oreb / (oreb + teamReboundData[opponent.team].dreb);

    // * Possessions
    const scoringPoss = fgm + (1 - (1 - (ftm / fta) ** 2)) * fta * 0.4;
    const totalPoss =
      0.5 *
      (fga +
        0.4 * fta -
        1.07 * ORBPerc * (fga - fgm) +
        tov +
        (opponent.fga +
          0.4 * opponent.fta -
          1.07 * (0 / (0 + treb)) * (opponent.fga - opponent.fgm) +
          opponent.tov));

    // * ORTG Necessary calculations
    const playPerc = scoringPoss / (fga + fta * 0.4 + tov);
    const ORBWeight =
      ((1 - ORBPerc) * playPerc) / ((1 - ORBPerc) * playPerc + ORBPerc * (1 - playPerc));

    // * Randomly assign offensive rebounds to individual players
    const playersOnTeam = _.shuffle(
      _.filter(rawPlayerData, ({ team, treb }) => {
        // ! Sometimes team is a number... sometimes it's a string ugh
        // eslint-disable-next-line eqeqeq
        return team == teamKey && treb > 0;
      })
    );

    playersOnTeam.forEach((player) => {
      playerReboundData[player.name] = {
        oreb: 0
      };
    });

    let orebCount = oreb;

    // * Loop through the players and assign oreb to their reb property
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < playersOnTeam.length && orebCount > 0; i++) {
      const player = playersOnTeam[i];
      const maxReb = player.treb;
      const maxAssign = Math.min(orebCount, maxReb);
      const reboundsAssigned = Math.floor(Math.random() * maxAssign) + 1;
      playerReboundData[player.name].oreb += reboundsAssigned;
      orebCount -= reboundsAssigned; // * decrease oreb by the amount assigned
      // TODO This may not assign all rebounds. But this is an estimation anyway so whatever, this can be improved later
      // TODO Also if there are replicating names (ex. AI Player) they'll end up with the same oboards
    }

    formattedTeamData[teamKey] = {
      ...teamData,
      totalPoss,
      twopm,
      twopa,
      dreb,
      oreb,
      ORBPerc,
      scoringPoss,
      playPerc,
      ORBWeight,
      mp
    };
  });

  const formattedPlayerData = rawPlayerData.map((playerData) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let formattedPlayer: any;
    // * Load image recognized stats first
    // * Destructure stats that we'll use for calculations and readability
    const {
      team: teamKey,
      name,
      pts,
      oppPos,
      treb,
      ast,
      stl,
      blk,
      fgm,
      fga,
      threepm,
      threepa
    } = playerData;

    // * Team data ( might be a waste of space...? )
    const team = formattedTeamData[teamKey];

    // * Plus Minus needs the opposing team data
    let plusMinus = 0;
    const opposingTeamKey = Object.keys(formattedTeamData).find(
      (teamDataKey) => parseInt(teamDataKey, 10) !== teamKey
    );
    let pace = team.totalPoss;
    if (opposingTeamKey) {
      plusMinus = team.pts - formattedTeamData[opposingTeamKey].pts;
      pace = (team.totalPoss + formattedTeamData[opposingTeamKey].totalPoss) / 2;
    }

    const opponent = rawPlayerData.find(
      (player) => player.pos === oppPos && player.team !== teamKey
    );

    // * minutes played
    const mp = 20;

    // * Assume there are no offensive rebounds since we have no way of figuring out oreb
    const { oreb = 0 } = playerReboundData[name] || {};
    const dreb = treb - oreb;
    // * Get 2PM to figure out FTM
    const { twopa, twopm } = calculateTwoPointers(fga, fgm, threepa, threepm);
    // * double double, triple doubles, quadruple doubles
    const { dd, td, qd } = calculateDoubles(pts, treb, ast, stl, blk);

    // * Add simple stats to player object
    // eslint-disable-next-line prefer-const
    formattedPlayer = {
      ...playerData,
      pace,
      mp,
      dreb,
      oreb,
      twopa,
      twopm,
      dd,
      td,
      qd
    };

    // * Calculate advanced offensive stats
    const { ortg, floorPerc, astPerc, tovPerc, usageRate, gameScore } =
      calculateAdvancedOffensiveStats(formattedPlayer, team);

    const opOREB = opponent?.name ? playerReboundData[opponent.name]?.oreb || 0 : 0;

    if (!opponent) {
      console.error('No opponent found for player', formattedPlayer.name);
      return;
    }

    // * Calculate advanced defensive stats
    const { drtg, drebPerc, oFGA, oFGM, o3PA, o3PM } = calculateAdvancedDefensiveStats(
      formattedPlayer,
      opponent,
      opOREB,
      team
    );

    // * Calculate PER
    const { aPER, PER: playerPER, uPER } = calculateAPER(formattedPlayer, team, league);

    // * Calculate ELO

    return {
      ...formattedPlayer,
      aPER,
      uPER,
      PER: playerPER,
      oFGA,
      oFGM,
      o3PA,
      o3PM,
      ortg,
      floorPerc,
      astPerc,
      tovPerc,
      usageRate,
      gameScore,
      drtg,
      drebPerc,
      plusMinus
    };
  });

  // * Batch writes
  const batch = admin.firestore().batch();
  formattedPlayerData.forEach((player) => {
    const gamesRef = admin.firestore().collection('games').doc();
    batch.set(gamesRef, {
      ...player,
      uploadId,
      _createdAt: admin.firestore.Timestamp.now(),
      _updatedAt: admin.firestore.Timestamp.now()
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await batch.commit().then((docRef) => {
    // eslint-disable-next-line no-console
    // console.log('Document written with ID: ', docRef);
  });

  const authToken = returnAuthToken(req);
  if (!authToken) {
    error('No admin found for audit while trying to upload screenshot', uploadId);
  } else {
    const userInfo = await admin.auth().verifyIdToken(authToken);
    const auditData: Audit = {
      uploadId,
      admin: userInfo?.email || '',
      description: ' uploaded screenshot'
    };
    await addAudit(auditData);
  }

  log('uploadStats', { formattedPlayerData, formattedTeamData });

  res.json({ formattedPlayerData, formattedTeamData });
};

export default uploadStats;

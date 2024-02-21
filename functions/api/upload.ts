import admin from 'firebase-admin';
import _ from 'lodash';
import {
  calculateAPER,
  calculateAdvancedDefensiveStats,
  calculateAdvancedOffensiveStats,
  calculateDoubles,
  calculateFreeThrowsMade,
  calculateTwoPointers,
  estimateFreeThrowAttempts,
  getExpectedORebounds
} from '../utils';
import { DEFAULT_FT_PERC, UPLOAD_KEY } from '../constants';
import { LeagueData, PlayerData } from '../types';

// ? Used to estimate OREB
const FG_OREB_PERC = 0.22;
const THREEP_OREB_PERC = 0.28;

interface PlayerFTData {
  alias: string;
  ftPerc: number;
}

const uploadStats = async (req: any, res: any): Promise<void> => {
  const { rawTeamData, rawPlayerData, key } = req.body;

  if (!key || typeof key !== 'string' || key !== UPLOAD_KEY) {
    throw Error('Invalid request parameters');
  }

  const formattedTeamData = {};
  const teamReboundData = {};
  const playerReboundData = {};
  const playerFreeThrowData = {};

  const db = admin.firestore();
  // * Fetch league data for PER
  const league = await db
    .collection('league')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
    .then((querySnapshot) => {
      // * should only be one because of limit
      const leagueData: LeagueData[] = [];
      querySnapshot.forEach((doc) => {
        leagueData.push(doc.data() as LeagueData);
      });
      return leagueData?.[0];
    });

  // * Fetch possible Free Throw data for each player
  const playerNames = rawPlayerData.map(({ name }) => name);
  const playerFT: PlayerFTData[] = [];
  await db
    .collection('players')
    .where('alias', 'array-contains-any', playerNames)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const { alias, ftPerc } = doc.data();
        playerFT.push({ alias, ftPerc });
      });
    });

  // * Calculate FTA for each player (must be done before team calculations to get team total FTA)
  rawPlayerData.forEach((playerData) => {
    const { fga, fgm, threepa, threepm, pts, name, team } = playerData;
    // * Estimate FTA
    const { twopm } = calculateTwoPointers(fga, fgm, threepa, threepm);
    const ftm = calculateFreeThrowsMade(pts, twopm, threepm);
    // * We cannot get the FTA without knowing FT%, so find it if the player exists and has a default FT Perc
    const { ftPerc = DEFAULT_FT_PERC } = playerFT.find(({ alias }) => alias.includes(name)) || {};
    const fta = ftm === 0 ? 0 : estimateFreeThrowAttempts(ftm, ftPerc);
    // * Name : {fta, team}
    playerFreeThrowData[name] = { fta, team };
  });
  // * Add to sum for the team total
  const teamFreeThrowData = Object.values(playerFreeThrowData).reduce(
    (acc: Record<string, number>, player: any) => {
      const { fta, team } = player;
      acc[team] = (acc[team] || 0) + fta;
      return acc;
    },
    {} as Record<string, number>
  );

  // * Calculate oreb for both teams first (estimations) then set basic stats
  Object.keys(rawTeamData).forEach((teamKey) => {
    const teamData = rawTeamData[teamKey];
    const { reb, fgm, fga, threepm, threepa } = teamData;
    const missed3P = threepa - threepm;
    const missed2P = fga - fgm - missed3P;

    // * Estimate OREB
    const expected = Math.floor(missed3P * THREEP_OREB_PERC + missed2P * FG_OREB_PERC);
    const oreb = getExpectedORebounds(reb, expected);
    const dreb = Math.abs(reb - oreb);

    teamReboundData[teamKey] = {
      dreb,
      oreb
    };
  });

  Object.keys(rawTeamData).forEach((teamKey) => {
    const mp = 100; // * Each games is 20 minutes so total minutes is always 100

    // * Load image recognized stats first
    // * Destructure stats that we'll use for calculations and readability
    const { [teamKey]: teamData, ...rest } = rawTeamData;
    const opponent: any = Object.values(rest)[0];
    const { pts, reb, tov, fgm, fga, threepm, threepa } = teamData;

    const { twopa, twopm } = calculateTwoPointers(fga, fgm, threepa, threepm);
    // * We cannot get the FTA without knowing FT%, so just calculate FTM
    const ftm = calculateFreeThrowsMade(pts, twopm, threepm) || 0;
    // * Add up FTA from previous teamFreeThrowData calculation. This cannot be 0 (set to 1) otherwise we divide by 0
    const fta = teamFreeThrowData?.[teamKey] || 1;
    const opFTA = teamFreeThrowData?.[opponent.team] || 1;

    const { dreb, oreb } = teamReboundData[teamKey];
    const ORBPerc = oreb / (oreb + (opponent.reb + teamReboundData[opponent.team].oreb));

    // * Possessions
    const scoringPoss = fgm + (1 - (1 - (ftm / fta) ** 2)) * fta * 0.4;
    const totalPoss =
      0.5 *
      (fga +
        0.4 * fta -
        1.07 * (oreb / (oreb + opponent.reb)) * (fga - fgm) +
        tov +
        (opponent.fga +
          0.4 * opFTA -
          1.07 * (0 / (0 + reb)) * (opponent.fga - opponent.fgm) +
          opponent.tov));

    // * ORTG Necessary calculations
    const playPerc = scoringPoss / (fga + fta * 0.4 + tov);
    const ORBWeight =
      ((1 - ORBPerc) * playPerc) / ((1 - ORBPerc) * playPerc + ORBPerc * (1 - playPerc));

    // * Randomly assign offensive rebounds to individual players
    const playersOnTeam = _.shuffle(
      _.filter(rawPlayerData, ({ team, treb }) => {
        // * Sometimes team is a number... sometimes it's a string ugh
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
      ftm,
      fta,
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
    let formattedPlayer: PlayerData;
    // * Load image recognized stats first
    // * Destructure stats that we'll use for calculations and readability
    const {
      team: teamKey,
      name,
      pts,
      pos,
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
    const opponent = rawPlayerData.find((player) => player.pos === pos && player.team !== teamKey);

    // * minutes played
    const mp = 20;

    // * Assume there are no offensive rebounds since we have no way of figuring out oreb
    const { oreb = 0 } = playerReboundData[name] || {};
    const dreb = treb - oreb;
    // * Get 2PM to figure out FTM
    const { twopa, twopm } = calculateTwoPointers(fga, fgm, threepa, threepm);
    const ftm = calculateFreeThrowsMade(pts, twopm, threepm);
    const fta = playerFreeThrowData[name]?.fta;
    // * double double, triple doubles, quadruple doubles
    const { dd, td, qd } = calculateDoubles(pts, treb, ast, stl, blk);

    // * Add simple stats to player object
    // eslint-disable-next-line prefer-const
    formattedPlayer = {
      ...playerData,
      pace: team.totalPoss,
      mp,
      dreb,
      oreb,
      twopa,
      twopm,
      ftm,
      fta,
      dd,
      td,
      qd
    };

    // * Calculate advanced offensive stats
    const { ortg, floorPerc, astPerc, tovPerc, usageRate, gameScore } =
      calculateAdvancedOffensiveStats(formattedPlayer, team);

    const opOREB = playerReboundData[opponent.name]?.oreb || 0;
    // * Calculate advanced defensive stats
    const { drtg, drebPerc, oFGA, oFGM, o3PA, o3PM } = calculateAdvancedDefensiveStats(
      formattedPlayer,
      opponent,
      opOREB,
      team
    );

    // * Calculate PER
    const { aPER, PER: playerPER } = calculateAPER(formattedPlayer, team, league);

    return {
      ...formattedPlayer,
      aPER,
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
      drebPerc
    };
  });

  // * Batch writes
  const batch = admin.firestore().batch();
  formattedPlayerData.forEach((player) => {
    const gamesRef = admin.firestore().collection('games').doc();
    batch.set(gamesRef, {
      ...player,
      _createdAt: admin.firestore.Timestamp.now(),
      _updatedAt: admin.firestore.Timestamp.now()
    });
  });

  await batch.commit().then((docRef) => {
    // eslint-disable-next-line no-console
    console.log('Document written with ID: ', docRef);
  });

  res.json({ formattedPlayerData, formattedTeamData });
};

export default uploadStats;

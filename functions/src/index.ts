import { https, firestore, pubsub } from 'firebase-functions';
import admin from 'firebase-admin';
import cors from 'cors';
import express from 'express';

import { corsOptionsDelegate } from '../utils/corsOptionsDelegate';

// * Rest functions
import uploadStats from '../api/upload';
import fetchForTable from '../api/fetchForTable';
import testFirebaseStuff from '../api/testFirebaseStuff';
import fetchPlayerData from '../api/fetchPlayerData';
import updatePlayerDetails from '../api/updatePlayerDetails';
import fetchIndividualRanking from '../api/ranking';
import fetchLastGames from '../api/fetchLastGames';
import fetchLeagueAverages from '../api/fetchLeagueAverages';
import compareToNBA from '../api/compareToNBA';

// * Cloud triggers
import { upsertPlayerData } from '../api/triggers/games';

// * Cron jobs
import deleteDuplicateGames from '../api/scheduled/deleteDuplicateGames';
import generateLeagueAverage from '../api/scheduled/generateLeagueAverage';
import { recalculatePlayerAverages } from '../api/scheduled/recalculatePlayerAverages';

admin.initializeApp();

const app = express();
app.use(cors());

// * REST endpoints
app.post('/upload', cors(corsOptionsDelegate), uploadStats);
app.get('/testFunctions', cors(corsOptionsDelegate), testFirebaseStuff);
app.post('/queryTableData', cors(corsOptionsDelegate), fetchForTable);
app.get('/lookupPlayer', cors(corsOptionsDelegate), fetchPlayerData);
app.post('/updatePlayerDetails', cors(corsOptionsDelegate), updatePlayerDetails);
app.get('/ranking', cors(corsOptionsDelegate), fetchIndividualRanking);
app.get('/fetchLastGames', cors(corsOptionsDelegate), fetchLastGames);
app.get('/league', cors(corsOptionsDelegate), fetchLeagueAverages);
app.get('/similarity', cors(corsOptionsDelegate), compareToNBA);

exports.app = https.onRequest(app);

// * Cloud Triggers
exports.upsertPlayerData = firestore.document('games/{gameId}').onWrite(upsertPlayerData);
exports.generateLeagueAverage = pubsub
  .schedule('0 23 * * 7')
  .timeZone('America/New_York')
  .onRun(generateLeagueAverage);
exports.deleteDuplicateGames = pubsub
  .schedule('0 23 * * *')
  .timeZone('America/New_York')
  .onRun(deleteDuplicateGames);
exports.recalculatePlayerAverages = pubsub
  .schedule('0 23 * * *')
  .timeZone('America/New_York')
  .onRun(recalculatePlayerAverages);

import { https, firestore, pubsub, auth } from 'firebase-functions';
import admin from 'firebase-admin';
import cors from 'cors';
import express from 'express';
import expressCache from 'cache-express';
import { rateLimit } from 'express-rate-limit';

import { corsOptionsDelegate } from '../utils/corsOptionsDelegate';
import { checkIfAdmin } from './auth';

// * Rest functions
import uploadStats from '../api/upload';
import fetchForTable from '../api/fetchForTable';
import testFirebaseStuff from '../api/testFirebaseStuff';
import fetchPlayerData from '../api/fetchPlayerData';
import fetchIndividualRanking from '../api/ranking';
import fetchLastGames from '../api/fetchLastGames';
import fetchLeagueAverages from '../api/fetchLeagueAverages';
import compareToNBA from '../api/compareToNBA';
import { recalculatePlayerAverageAPI, generateLeagueAverageAPI } from '../api/dashboardFunctions';
import { generateAwards } from '../api/generateAwards';
import fetchAwards from '../api/fetchAwards';
import { fetchPlayerDataByPosition } from '../api/fetchPlayerDataByPosition';
import fetchLastGame from '../api/fetchLastUploadedGame';

// * Cloud triggers
import { upsertPlayerData } from '../api/triggers/games';
import { setCustomClaims } from '../api/triggers/admin';

// * Cron jobs
import deleteDuplicateGames from '../api/scheduled/deleteDuplicateGames';
import generateLeagueAverage from '../api/scheduled/generateLeagueAverage';
import { recalculatePlayerAverages } from '../api/scheduled/recalculatePlayerAverages';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

const cache = expressCache({
  timeOut: 1000 * 60 * 60 * 24
});

admin.initializeApp();

const app = express();
app.use(cors(corsOptionsDelegate));
app.use(limiter);

// * REST endpoints
app.post('/upload', checkIfAdmin, uploadStats);
app.get('/testFunctions', checkIfAdmin, testFirebaseStuff);
app.post('/queryTableData', fetchForTable);
app.get('/recalculatePlayerAverages', checkIfAdmin, recalculatePlayerAverageAPI);
app.get('/generateLeagueAverage', checkIfAdmin, generateLeagueAverageAPI);
app.get('/lookupPlayer', fetchPlayerData);
app.get('/ranking', fetchIndividualRanking);
app.get('/fetchLastGames', fetchLastGames);
app.get('/fetchLastUploadedGame', cache, fetchLastGame);
app.get('/league', cache, fetchLeagueAverages);
app.get('/similarity', compareToNBA);
app.get('/generateAwards', checkIfAdmin, generateAwards);
app.get('/fetchAwards', cache, fetchAwards);
app.get('/fetchPlayerDataByPosition', fetchPlayerDataByPosition);

exports.app = https.onRequest(app);

// * Cloud Triggers
exports.upsertPlayerData = firestore.document('games/{gameId}').onWrite(upsertPlayerData);
exports.setCustomClaims = auth.user().onCreate(setCustomClaims);
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

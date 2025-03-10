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
import fetchLastGames from '../api/fetchLastGames';
import fetchLeagueAverages from '../api/fetchLeagueAverages';
import compareToNBA from '../api/compareToNBA';
import { recalculatePlayerAverageAPI, generateLeagueAverageAPI } from '../api/dashboardFunctions';
import { generateAwards } from '../api/generateAwards';
import fetchAwards from '../api/fetchAwards';
import { fetchPlayerDataByPosition } from '../api/fetchPlayerDataByPosition';
import fetchLastGame from '../api/fetchLastUploadedGame';
import { fetchArchive } from '../api/fetchArchive';
import fetchRelatedGames from '../api/fetchRelatedGames';
import fetchForTableByPosition from '../api/fetchForTableByPosition';
import fetchInsightForPlayer from '../api/fetchInsightForPlayer';

// * Cloud triggers
import { upsertPlayerData } from '../api/triggers/games';
import { setCustomClaims } from '../api/triggers/admin';
import { addEloAfterUpload } from '../api/triggers/elo';

// * Cron jobs
import deleteDuplicateGames from '../api/scheduled/deleteDuplicateGames';
import generateLeagueAverage from '../api/scheduled/generateLeagueAverage';
import { recalculatePlayerAverages } from '../api/scheduled/recalculatePlayerAverages';

const limiter = rateLimit({
  windowMs: 1000 * 60 * 15, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'test-ip' // Provide fallback IP for testing
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
app.get('/fetchLastGames', fetchLastGames);
app.get('/fetchLastUploadedGame', cache, fetchLastGame);
app.get('/league', cache, fetchLeagueAverages);
app.get('/similarity', compareToNBA);
app.get('/generateAwards', checkIfAdmin, generateAwards);
app.get('/fetchAwards', cache, fetchAwards);
app.get('/fetchPlayerDataByPosition', fetchPlayerDataByPosition);
app.get('/fetchArchive', cache, fetchArchive);
app.get('/fetchRelatedGames', fetchRelatedGames);
app.get('/deleteDuplicateGames', checkIfAdmin, deleteDuplicateGames);
app.get('/fetchForTableByPosition', fetchForTableByPosition);
app.get('/fetchInsightForPlayer', fetchInsightForPlayer);

exports.app = https.onRequest(app);

// * Cloud Triggers
exports.addEloAfterUpload = firestore.document('uploads/{uploadId}').onCreate(addEloAfterUpload);
exports.upsertPlayerData = firestore.document('games/{gameId}').onWrite(upsertPlayerData);
exports.setCustomClaims = auth.user().onCreate(setCustomClaims);
exports.generateLeagueAverage = pubsub
  .schedule('0 23 * * 7')
  .timeZone('America/New_York')
  .onRun(generateLeagueAverage);
exports.recalculatePlayerAverages = pubsub
  .schedule('0 23 * * *')
  .timeZone('America/New_York')
  .onRun(recalculatePlayerAverages);

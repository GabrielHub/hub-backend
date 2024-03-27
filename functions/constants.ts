import { defineSecret } from 'firebase-functions/params';

export const whitelist = [
  'http://localhost:3000',
  'https://gabrielhub.github.io/hub',
  'https://gabrielhub-60a30.web.app',
  'https://gabrielhub-60a30.firebaseapp.com'
];

export const UPLOAD_KEY = defineSecret('HUB_UPLOAD_KEY');
export const DEFAULT_FT_PERC = 67;

// * For NBA Comparison
export const PER_GAME = 'PerGame';
export const PER_36_MINUTES = 'Per36';
export const PER_100 = 'Per100Possessions';
export const expectedPerGameFormats = [PER_36_MINUTES, PER_100, PER_GAME];

// TODO I broke this at some point, so not using it until it's fixed
/** Min games to record data */
export const MIN_GAMES = 3;

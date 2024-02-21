import functions from 'firebase-functions';
export const whitelist = ['http://localhost:3000', 'https://gabrielhub.github.io/hub'];

export const UPLOAD_KEY = functions.config().hub.uploadkey;
export const NANONET_KEY = functions.config().hub.nanonetkey;
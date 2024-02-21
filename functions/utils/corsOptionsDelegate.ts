import express from 'express';
import cors from 'cors';
import { whitelist } from '../constants';

export const corsOptionsDelegate = (
  req: express.Request,
  callback: (err: Error | null, options?: cors.CorsOptions) => void
) => {
  let corsOptions;
  const origin = req.header('Origin') || ''; // Provide a default value
  if (whitelist.indexOf(origin) !== -1) {
    corsOptions = { origin: true }; // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false }; // disable CORS for this request
  }
  callback(null, corsOptions); // callback expects two parameters: error and options
};

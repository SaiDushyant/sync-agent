require('dotenv').config();
const ConfigurationError = require('../errors/ConfigurationError');


function loadConfig() {
  const env = process.env;
  const trim = (val) => (typeof val === 'string' ? val.trim() : val);

  const TALLY_HOST = trim(env.TALLY_HOST);
  if (!TALLY_HOST) throw new ConfigurationError('Configuration Error: TALLY_HOST is required.');

  const TALLY_PORT = parseInt(trim(env.TALLY_PORT), 10);
  if (isNaN(TALLY_PORT)) throw new ConfigurationError('Configuration Error: TALLY_PORT must be a valid integer.');

  const API_URL = trim(env.API_URL);
  if (!API_URL) throw new ConfigurationError('Configuration Error: API_URL is required.');

  const API_KEY = trim(env.API_KEY);
  if (!API_KEY) throw new ConfigurationError('Configuration Error: API_KEY is required.');

  const SYNC_INTERVAL = parseInt(trim(env.SYNC_INTERVAL), 10);
  if (isNaN(SYNC_INTERVAL) || SYNC_INTERVAL <= 0) {
    throw new ConfigurationError('Configuration Error: SYNC_INTERVAL must be a positive integer.');
  }

  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  const LOG_LEVEL = trim(env.LOG_LEVEL);
  if (!validLogLevels.includes(LOG_LEVEL)) {
    throw new ConfigurationError(`Configuration Error: LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  const DATABASE_PATH = trim(env.DATABASE_PATH);
  if (!DATABASE_PATH) throw new ConfigurationError('Configuration Error: DATABASE_PATH is required.');

  const REQUEST_TIMEOUT = parseInt(trim(env.REQUEST_TIMEOUT), 10);
  if (isNaN(REQUEST_TIMEOUT) || REQUEST_TIMEOUT <= 0) {
    throw new ConfigurationError('Configuration Error: REQUEST_TIMEOUT must be a positive integer.');
  }

  const API_REQUEST_TIMEOUT = parseInt(trim(env.API_REQUEST_TIMEOUT), 10);
  if (isNaN(API_REQUEST_TIMEOUT) || API_REQUEST_TIMEOUT <= 0) {
    throw new ConfigurationError('Configuration Error: API_REQUEST_TIMEOUT must be a positive integer.');
  }

  return Object.freeze({
    TALLY_HOST,
    TALLY_PORT,
    API_URL,
    API_KEY,
    syncInterval: SYNC_INTERVAL,
    logLevel: LOG_LEVEL,
    DATABASE_PATH,
    requestTimeout: REQUEST_TIMEOUT,
    apiRequestTimeout: API_REQUEST_TIMEOUT
  });
}

module.exports = { loadConfig };

require('dotenv').config();

function loadConfig() {
  const env = process.env;
  const trim = (val) => (typeof val === 'string' ? val.trim() : val);

  const TALLY_HOST = trim(env.TALLY_HOST);
  if (!TALLY_HOST) throw new Error('Configuration Error: TALLY_HOST is required.');

  const TALLY_PORT = parseInt(trim(env.TALLY_PORT), 10);
  if (isNaN(TALLY_PORT)) throw new Error('Configuration Error: TALLY_PORT must be a valid integer.');

  const API_URL = trim(env.API_URL);
  if (!API_URL) throw new Error('Configuration Error: API_URL is required.');

  const API_KEY = trim(env.API_KEY);
  if (!API_KEY) throw new Error('Configuration Error: API_KEY is required.');

  const SYNC_INTERVAL = parseInt(trim(env.SYNC_INTERVAL), 10);
  if (isNaN(SYNC_INTERVAL) || SYNC_INTERVAL <= 0) {
    throw new Error('Configuration Error: SYNC_INTERVAL must be a positive integer.');
  }

  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  const LOG_LEVEL = trim(env.LOG_LEVEL);
  if (!validLogLevels.includes(LOG_LEVEL)) {
    throw new Error(`Configuration Error: LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  const DATABASE_PATH = trim(env.DATABASE_PATH);
  if (!DATABASE_PATH) throw new Error('Configuration Error: DATABASE_PATH is required.');

  return Object.freeze({
    TALLY_HOST,
    TALLY_PORT,
    API_URL,
    API_KEY,
    SYNC_INTERVAL,
    LOG_LEVEL,
    DATABASE_PATH
  });
}

module.exports = { loadConfig };

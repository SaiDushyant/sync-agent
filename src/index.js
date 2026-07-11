const { loadConfig } = require('./config/Config');
const TallyClient = require('./tally/TallyClient');
const parser = require('./parser/XmlParser');
const HashEngine = require('./hashing/HashEngine');
const ApiClient = require('./api/ApiClient');
const database = require('./database/Database');
const SyncEngine = require('./sync/SyncEngine');
const Scheduler = require('./scheduler/Scheduler');
const Logger = require('./logger/Logger');

let config;
let scheduler;
let logger;

try {
  config = loadConfig();
  logger = new Logger(config);
  logger.info('Tally Sync Agent starting...');
  
  // Initialize dependencies
  database.initialize();
  const tallyClient = new TallyClient(config);
  const hashEngine = new HashEngine(database);
  const apiClient = new ApiClient(config);

  const syncEngine = new SyncEngine({
      tallyClient,
      parser,
      hashEngine,
      apiClient,
      database
  });

  scheduler = new Scheduler(syncEngine, config, logger);
  scheduler.start();

  logger.info('Configuration loaded successfully.');
  logger.info('Scheduler started.');
} catch (error) {
  if (logger) {
      logger.error(error.message);
  } else {
      console.error(error.message);
  }
  process.exit(1);
}

async function handleShutdown(signal) {
  if (logger) logger.info(`Received ${signal}. Shutting down cleanly...`);
  if (scheduler) {
      await scheduler.stop();
  }
  database.close();
  if (logger) {
      logger.info('Shutdown complete.');
      logger.close();
  }
  process.exit(0);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

if (logger) logger.info('Tally Sync Agent is running. Press Ctrl+C to stop.');

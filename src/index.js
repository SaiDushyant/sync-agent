const { loadConfig } = require('./config/Config');
const TallyClient = require('./tally/TallyClient');
const parser = require('./parser/XmlParser');
const HashEngine = require('./hashing/HashEngine');
const ApiClient = require('./api/ApiClient');
const database = require('./database/Database');
const SyncEngine = require('./sync/SyncEngine');
const Scheduler = require('./scheduler/Scheduler');

let config;
let scheduler;

try {
  config = loadConfig();
  console.log('Tally Sync Agent starting...');
  
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

  scheduler = new Scheduler(syncEngine, config);
  scheduler.start();

  console.log('Configuration loaded successfully.');
  console.log('Scheduler started.');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

async function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down cleanly...`);
  if (scheduler) {
      await scheduler.stop();
  }
  database.close();
  console.log('Shutdown complete.');
  process.exit(0);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

console.log('Tally Sync Agent is running. Press Ctrl+C to stop.');

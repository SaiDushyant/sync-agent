const { loadConfig } = require('./config/Config');

let config;

try {
  config = loadConfig();
  console.log('Tally Sync Agent starting...');
  console.log('Configuration loaded successfully.');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down cleanly...`);
  process.exit(0);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

console.log('Tally Sync Agent is running. Press Ctrl+C to stop.');

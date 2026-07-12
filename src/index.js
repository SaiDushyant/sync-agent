console.log("========== TALLY SYNC AGENT DEBUG START ==========");

const { loadConfig } = require('./config/Config');
console.log("[1] Config module loaded");

const TallyClient = require('./tally/TallyClient');
console.log("[2] TallyClient module loaded");

const parser = require('./parser/XmlParser');
console.log("[3] XmlParser module loaded");

const HashEngine = require('./hashing/HashEngine');
console.log("[4] HashEngine module loaded");

const ApiClient = require('./api/ApiClient');
console.log("[5] ApiClient module loaded");

const database = require('./database/Database');
console.log("[6] Database module loaded");

const SyncEngine = require('./sync/SyncEngine');
console.log("[7] SyncEngine module loaded");

const Scheduler = require('./scheduler/Scheduler');
console.log("[8] Scheduler module loaded");

const Logger = require('./logger/Logger');
console.log("[9] Logger module loaded");

let config;
let scheduler;
let logger;

try {
    console.log("[10] Calling loadConfig()");
    config = loadConfig();
    console.log("[11] loadConfig() completed");
    console.log(config);

    console.log("[12] Creating Logger");
    logger = new Logger(config);
    console.log("[13] Logger created");

    logger.info("Logger initialized");

    console.log("[14] Initializing Database");
    database.initialize();
    console.log("[15] Database initialized");

    console.log("[16] Creating TallyClient");
    const tallyClient = new TallyClient(config);
    console.log("[17] TallyClient created");

    console.log("[18] Creating HashEngine");
    const hashEngine = new HashEngine(database);
    console.log("[19] HashEngine created");

    console.log("[20] Creating ApiClient");
    const apiClient = new ApiClient(config);
    console.log("[21] ApiClient created");

    console.log("[22] Creating SyncEngine");
    const syncEngine = new SyncEngine({
        tallyClient,
        parser,
        hashEngine,
        apiClient,
        database
    });
    console.log("[23] SyncEngine created");

    console.log("[24] Creating Scheduler");
    scheduler = new Scheduler(syncEngine, config, logger);
    console.log("[25] Scheduler created");

    console.log("[26] Starting Scheduler");
    scheduler.start();
    console.log("[27] Scheduler started");

    logger.info("Scheduler started");

    console.log("[28] Startup completed successfully");
}
catch (error) {
    console.error("========== STARTUP FAILED ==========");
    console.error(error);
    console.error(error.stack);

    if (logger) {
        logger.error(error.message);
    }

    process.exit(1);
}

process.on("uncaughtException", (err) => {
    console.error("========== UNCAUGHT EXCEPTION ==========");
    console.error(err);
    console.error(err.stack);
});

process.on("unhandledRejection", (err) => {
    console.error("========== UNHANDLED REJECTION ==========");
    console.error(err);
});

process.on("exit", (code) => {
    console.log("========== PROCESS EXIT ==========");
    console.log("Exit Code:", code);
});

process.on("beforeExit", (code) => {
    console.log("========== BEFORE EXIT ==========");
    console.log("Exit Code:", code);
});

process.on("SIGINT", async () => {
    console.log("========== SIGINT ==========");

    if (scheduler) {
        await scheduler.stop();
    }

    database.close();

    if (logger) {
        logger.close();
    }

    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("========== SIGTERM ==========");

    if (scheduler) {
        await scheduler.stop();
    }

    database.close();

    if (logger) {
        logger.close();
    }

    process.exit(0);
});

setInterval(() => {
    console.log("Still Alive:", new Date().toISOString());
}, 5000);

console.log("========== END OF FILE ==========");
const SyncError = require('../errors/SyncError');

class Scheduler {
    constructor(syncEngine, config, logger) {
        if (!syncEngine || !config || !logger) {
            throw new SyncError('Scheduler requires syncEngine, config, and logger');
        }
        this.syncEngine = syncEngine;
        this.logger = logger;
        this.syncIntervalMs = config.syncInterval * 1000;
        
        this.timer = null;
        this.isRunning = false;
        this.isShuttingDown = false;
        this.isStarted = false;
        this.currentRunPromise = null;
    }

    /**
     * Starts the scheduler.
     * Runs one sync immediately, then schedules recurring executions.
     */
    start() {
        if (this.isStarted) {
            throw new SyncError('Scheduler is already started');
        }
        this.isStarted = true;

        if (this.isShuttingDown || this.timer) {
            return;
        }

        // Run immediately
        this._executeSync();

        // Then execute at the specified interval
        this.timer = setInterval(() => {
            this._executeSync();
        }, this.syncIntervalMs);
    }

    /**
     * Internal method to execute the sync engine.
     * Skips execution if a sync is already running.
     * Catches and ignores unhandled top-level errors to ensure future scheduling continues.
     */
    async _executeSync() {
        if (this.isRunning || this.isShuttingDown) {
            // Prevent overlapping syncs
            return;
        }

        this.isRunning = true;

        try {
            this.currentRunPromise = this.syncEngine.run();
            await this.currentRunPromise;
        } catch (error) {
            // One failed sync must not stop future syncs
            this.logger.error('Scheduled sync failed unexpectedly:', { error: error.message });
        } finally {
            this.isRunning = false;
            this.currentRunPromise = null;
        }
    }

    /**
     * Stops future scheduling and waits for any running sync to complete.
     * @returns {Promise<void>} Resolves when shutdown is complete.
     */
    async stop() {
        if (this.isShuttingDown) {
            if (this.currentRunPromise) {
                await this.currentRunPromise;
            }
            return;
        }
        this.isShuttingDown = true;
        this.isStarted = false;
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        if (this.isRunning && this.currentRunPromise) {
            // Wait for running sync to complete
            await this.currentRunPromise;
        }
    }
}

module.exports = Scheduler;

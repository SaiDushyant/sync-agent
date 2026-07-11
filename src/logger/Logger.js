const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

class Logger {
    constructor(config) {
        this.level = LOG_LEVELS.INFO;
        if (config && config.logLevel) {
            const configuredLevel = config.logLevel.toUpperCase();
            if (LOG_LEVELS[configuredLevel] !== undefined) {
                this.level = LOG_LEVELS[configuredLevel];
            }
        }
        this.logFilePath = path.join(process.cwd(), 'logs', 'sync-agent.log');
        this.fileStream = null;
        this.isClosed = false;
        this._initFileStream();
    }

    _initFileStream() {
        try {
            const logDir = path.dirname(this.logFilePath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            this.fileStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
            
            this.fileStream.on('error', (err) => {
                console.error('Logger failed to write to file:', err.message);
                this.fileStream = null;
            });
        } catch (error) {
            console.error('Failed to initialize log file:', error.message);
            this.fileStream = null;
        }
    }

    _log(levelName, message, metadata) {
        if (LOG_LEVELS[levelName] > this.level) {
            return;
        }

        const timestamp = new Date().toISOString();
        let logLine = `[${timestamp}] [${levelName}] ${message}`;
        
        if (metadata !== undefined) {
            try {
                logLine += ` ${JSON.stringify(metadata)}`;
            } catch (e) {
                logLine += ` [Metadata Stringify Error]`;
            }
        }
        
        logLine += '\n';

        if (this.fileStream) {
            try {
                this.fileStream.write(logLine);
            } catch (error) {
                // Ignore file write error, fallback to console
                console.error(logLine.trim());
            }
        } else {
            // Fallback if file writing failed
            if (levelName === 'ERROR') {
                console.error(logLine.trim());
            } else if (levelName === 'WARN') {
                console.warn(logLine.trim());
            } else {
                console.log(logLine.trim());
            }
        }
    }

    error(message, metadata) {
        this._log('ERROR', message, metadata);
    }

    warn(message, metadata) {
        this._log('WARN', message, metadata);
    }

    info(message, metadata) {
        this._log('INFO', message, metadata);
    }

    debug(message, metadata) {
        this._log('DEBUG', message, metadata);
    }
    
    close() {
        if (this.isClosed) return;
        this.isClosed = true;
        if (this.fileStream) {
            this.fileStream.end();
            this.fileStream = null;
        }
    }
}

module.exports = Logger;

const AppError = require('./AppError');
class SyncError extends AppError {
    constructor(message, options = {}) {
        super(message, { code: 'SYNC_ERROR', ...options });
    }
}
module.exports = SyncError;

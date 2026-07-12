const AppError = require('./AppError');
class HashEngineError extends AppError {
    constructor(message, options = {}) {
        super(message, { code: 'HASH_ENGINE_ERROR', ...options });
    }
}
module.exports = HashEngineError;

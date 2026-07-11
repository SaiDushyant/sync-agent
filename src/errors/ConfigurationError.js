const AppError = require('./AppError');
class ConfigurationError extends AppError {
    constructor(message, options = {}) {
        super(message, { code: 'CONFIGURATION_ERROR', ...options });
    }
}
module.exports = ConfigurationError;

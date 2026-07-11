const AppError = require('./AppError');
class ApiError extends AppError {
    constructor(message, options = {}) {
        super(message, { code: 'API_ERROR', ...options });
    }
}
module.exports = ApiError;

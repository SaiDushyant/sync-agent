const AppError = require('./AppError');
class DatabaseError extends AppError {
    constructor(message, options = {}) {
        super(message, { code: 'DATABASE_ERROR', ...options });
    }
}
module.exports = DatabaseError;

const AppError = require('./AppError');
class TallyError extends AppError {
    constructor(message, options = {}) {
        super(message, { code: 'TALLY_ERROR', ...options });
    }
}
module.exports = TallyError;

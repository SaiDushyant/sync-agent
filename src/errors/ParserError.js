const AppError = require('./AppError');
class ParserError extends AppError {
    constructor(message, options = {}) {
        super(message, { code: 'PARSER_ERROR', ...options });
    }
}
module.exports = ParserError;

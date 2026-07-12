class AppError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = options.code || 'APP_ERROR';
        this.cause = options.cause || null;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }
}
module.exports = AppError;

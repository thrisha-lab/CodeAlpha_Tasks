/**
 * Operational API error with an HTTP status code.
 * Thrown anywhere in controllers/services and converted to a JSON
 * response by the central error handler.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;

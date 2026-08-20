const logger = require("../utils/logger");

// Wraps async route handlers so thrown errors reach the error middleware
// instead of crashing the process.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Express recognizes this by its 4-argument signature.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl });
  } else {
    logger.warn(err.message, { path: req.originalUrl });
  }

  // apiRequest() in the frontend reads `data.error`, so keep this shape.
  res.status(status).json({
    error: status === 500 ? "Something went wrong on our end. Please try again." : err.message,
  });
}

function notFound(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { asyncHandler, errorHandler, notFound, ApiError };

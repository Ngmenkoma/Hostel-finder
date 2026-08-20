const winston = require("winston");
const path = require("path");

// The CloudWatch agent on EC2 is configured (see README) to tail
// logs/combined.log and logs/error.log and ship them to a log group.
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, "../../logs/error.log"), level: "error" }),
    new winston.transports.File({ filename: path.join(__dirname, "../../logs/combined.log") }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }));
} else {
  // Still log to stdout in production — useful for `pm2 logs` / journalctl,
  // in addition to the files CloudWatch agent ships.
  logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

module.exports = logger;

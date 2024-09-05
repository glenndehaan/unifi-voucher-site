/**
 * Import base packages
 */
const log = require('js-logger');

/**
 * Import own modules
 */
const variables = require('./variables');

/**
 * Setup logger
 */
const consoleLogger = log.createDefaultHandler({
    formatter: (messages, context) => {
        // Get current date, change this to the current timezone, then generate a date-time string
        const utcDate = new Date();
        const offset = utcDate.getTimezoneOffset();
        const date = new Date(utcDate.getTime() - (offset * 60 * 1000));
        const dateTimeString = date.toISOString().replace('T', ' ').replace('Z', '');

        // Prefix each log message with a timestamp and log level
        messages.unshift(`${dateTimeString} ${context.level.name}${context.level.name === 'INFO' || context.level.name === 'WARN' ? ' ' : ''}`);
    }
});

/**
 * Log Level converter
 */
const logConvert = (level) => {
    switch(level) {
        case "error":
            return log.ERROR;
        case "warn":
            return log.WARN;
        case "info":
            return log.INFO;
        case "debug":
            return log.DEBUG;
        case "trace":
            return log.TRACE;
        default:
            return log.INFO;
    }
}

/**
 * Set all logger handlers
 */
log.setHandler((messages, context) => {
    consoleLogger(messages, context);
});

/**
 * Set log level
 */
log.setLevel(logConvert(variables.logLevel));

/**
 * Export the application logger
 */
module.exports = log;

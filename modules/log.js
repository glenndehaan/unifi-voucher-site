/**
 * Import base packages
 */
const log = require('js-logger');

/**
 * Check if we are using the dev version
 */
const dev = process.env.NODE_ENV !== 'production';

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
 * Set all logger handlers
 */
log.setHandler((messages, context) => {
    consoleLogger(messages, context);
});

/**
 * Set log level
 */
log.setLevel(dev ? log.TRACE : log.INFO);

/**
 * Export the application logger
 */
module.exports = log;

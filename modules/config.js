/**
 * Import base modules
 */
const fs = require('fs');

/**
 * Get an option from external config (Home Assistant / Local Development)
 *
 * @param option
 */
module.exports = (option) => {
    // Check if Home Assistant config exists
    if (fs.existsSync('/data/options.json')) {
        return JSON.parse(fs.readFileSync('/data/options.json', 'utf-8'))[option];
    }

    // Check if Local (Development) config exists
    if (fs.existsSync(`${__dirname}/../.options.json`)) {
        return JSON.parse(fs.readFileSync(`${__dirname}/../.options.json`, 'utf-8'))[option];
    }

    return null;
};

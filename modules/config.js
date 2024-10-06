/**
 * Import base modules
 */
const fs = require('fs');

/**
 * Get an option from external config (Home Assistant / Local Development)
 *
 * @param option
 * @return {*|null}
 */
module.exports = (option) => {
    // Check if Home Assistant config exists
    if (fs.existsSync('/data/options.json')) {
        const data = JSON.parse(fs.readFileSync('/data/options.json', 'utf-8'));
        return typeof data[option] !== 'undefined' ? data[option] : null;
    }

    // Check if Local (Development) config exists
    if (fs.existsSync(`${__dirname}/../.options.json`)) {
        const data = JSON.parse(fs.readFileSync(`${__dirname}/../.options.json`, 'utf-8'));
        return typeof data[option] !== 'undefined' ? data[option] : null;
    }

    return null;
};

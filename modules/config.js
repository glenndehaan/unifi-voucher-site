/**
 * Import base modules
 */
const fs = require('fs');

/**
 * Get an option from external config (Home Assistant)
 *
 * @param option
 */
module.exports = (option) => {
    if (fs.existsSync('/app/options.json')) {
        return JSON.parse(fs.readFileSync('/app/options.json', 'utf-8'))[option];
    }

    return null;
};

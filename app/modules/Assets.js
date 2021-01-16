/**
 * Import vendor modules
 */
const fs = require("fs");

/**
 * Define public path
 */
const path = `${__dirname}/../../public/dist`;

/**
 * Return the manifest
 *
 * @return {any}
 */
module.exports = () => {
    return JSON.parse(fs.existsSync(path) ? fs.readFileSync(`${path}/rev-manifest.json`) : "{}");
};

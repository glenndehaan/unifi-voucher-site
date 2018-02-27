const fs = require("fs");
const path = `${__dirname}/../../../public/dist`;

module.exports = () => {
    return JSON.parse(fs.existsSync(path) ? fs.readFileSync(`${path}/rev-manifest.json`) : "{}");
};

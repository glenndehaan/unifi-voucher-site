const fs = require("fs");

module.exports = JSON.parse(fs.readFileSync(`${__dirname}/../../../public/dist/rev-manifest.json`));

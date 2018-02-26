const config = require("../../config/config");
const assets = require("../../helpers/modules/Assets");

class BaseController {
    constructor() {
        this.baseConfig = {
            config: config,
            hostname: '',
            baseUrl: '',
            assets: {
                js: false,
                css: false
            }
        }
    }

    /**
     * Returns the complete config base + page specific
     *
     * @param request
     * @param pageSpecificConfig
     */
    mergePageConfig(request, pageSpecificConfig) {
        this.baseConfig.hostname = request.hostname;
        this.baseConfig.baseUrl = `${request.protocol}://${request.hostname}${config.application.basePath}`;

        this.baseConfig.assets.js = assets["main.js"];
        this.baseConfig.assets.css = assets["main.css"];

        return Object.assign(this.baseConfig, pageSpecificConfig);
    }
}

module.exports = BaseController;

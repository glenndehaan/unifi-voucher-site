const config = require("../../config/config");

class BaseController {
    constructor() {
        this.baseConfig = {
            config: config,
            hostname: '',
            baseUrl: ''
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

        return Object.assign(this.baseConfig, pageSpecificConfig);
    }
}

module.exports = BaseController;

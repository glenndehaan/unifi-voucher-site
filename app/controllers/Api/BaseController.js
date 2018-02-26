class BaseController {
    constructor() {

    }

    /**
     * Send a response to express
     *
     * @param response
     * @param status
     * @param data
     * @param contentType
     */
    jsonResponse(response, status, data, contentType = 'application/json') {
        response.type(contentType);
        response.status(status);
        response.json(data);
    }
}

module.exports = BaseController;

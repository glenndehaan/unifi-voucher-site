const baseController = require('./BaseController');

class IndexController extends baseController {
    constructor() {
        super();
    }

    /**
     * Action for the default api route
     *
     * @param req
     * @param res
     */
    indexAction(req, res) {
        this.jsonResponse(res, 200, { 'message': 'Default API route!' });
    }
}

module.exports = new IndexController();

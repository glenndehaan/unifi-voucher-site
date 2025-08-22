/**
 * Import own modules
 */
const log = require('../modules/log');

module.exports = {
    /**
     * Handler for 404 status codes
     *
     * @param req
     * @param res
     */
    404: (req, res) => {
        res.status(404);
        res.render('404', {
            baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''
        });
    },

    /**
     * Handler for 500 status codes
     *
     * @param err
     * @param req
     * @param res
     * @param next
     */
    500: (err, req, res, next) => {
        log.error(err.stack);
        res.status(500);
        res.render('500', {
            baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
            error: err.stack
        });
    }
};

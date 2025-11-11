/**
 * Import base packages
 */
const crypto = require('crypto');

/**
 * Import own modules
 */
const variables = require('../modules/variables');

/**
 * Import own utils
 */
const status = require('../utils/status');

module.exports = {
    /**
     * GET - /status
     *
     * @param req
     * @param res
     */
    get: async (req, res) => {
        const user = req.oidc ? req.user : { email: 'admin' };

        res.render('status', {
            baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
            gitTag: variables.gitTag,
            gitBuild: variables.gitBuild,
            kioskEnabled: variables.kioskEnabled,
            user: user,
            userIcon: req.oidc ? crypto.createHash('sha256').update(user.email).digest('hex') : '',
            authDisabled: variables.authDisabled,
            status: status()
        });
    }
};

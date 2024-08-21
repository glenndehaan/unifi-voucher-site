/**
 * Import own modules
 */
const jwt = require('../modules/jwt');

/**
 * Global variables
 */
const authDisabled = (process.env.AUTH_DISABLE === 'true') || false;

/**
 * Verifies if a user is signed in
 *
 * @type {{web: ((function(*, *, *): Promise<void>)|*), api: ((function(*, *, *): Promise<void>)|*)}}
 */
module.exports = {
    /**
     * Handle web authentication
     *
     * @param req
     * @param res
     * @param next
     * @return {Promise<void>}
     */
    web: async (req, res, next) => {
        // Check if authentication is enabled
        if(!authDisabled) {
            // Check if user has an existing authorization cookie
            if (!req.cookies.authorization) {
                res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/login`);
                return;
            }

            // Check if token is correct and valid
            try {
                const check = jwt.verify(req.cookies.authorization);

                if(!check) {
                    res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Invalid or expired login!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/login`);
                }
            } catch (e) {
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Invalid or expired login!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/login`);
                return;
            }
        }

        next();
    },

    /**
     * Handle api authentication
     *
     * @param req
     * @param res
     * @param next
     * @return {Promise<void>}
     */
    api: async (req, res, next) => {
        // Check if authentication is enabled
        if(!authDisabled) {
            // Check if user has sent the authorization header
            if (!req.headers.authorization) {
                res.status(401).json({
                    error: 'Unauthorized',
                    data: {}
                });
                return;
            }

            // Check if password is correct
            const passwordCheck = req.headers.authorization === `Bearer ${(process.env.AUTH_TOKEN || "0000")}`;
            if (!passwordCheck) {
                res.status(403).json({
                    error: 'Forbidden',
                    data: {}
                });
                return;
            }
        }

        next();
    }
}

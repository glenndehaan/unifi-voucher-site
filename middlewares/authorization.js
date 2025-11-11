/**
 * Import base packages
 */
const oidc = require('express-openid-connect');

/**
 * Import own modules
 */
const variables = require('../modules/variables');
const jwt = require('../modules/jwt');

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
        let internal = false;
        let oidc = false;

        // Continue is authentication is disabled
        if(variables.authDisabled) {
            next();
            return;
        }

        // Check if Internal auth is enabled then verify user status
        if(variables.authInternalEnabled) {
            // Check if user has an existing authorization cookie
            if (req.cookies.authorization) {
                // Check if token is correct and valid
                try {
                    const check = jwt.verify(req.cookies.authorization);

                    if(check) {
                        internal = true;
                    }
                } catch (e) {}
            }
        }

        // Check if OIDC is enabled then verify user status
        if(variables.authOidcEnabled) {
            oidc = req.oidc.isAuthenticated();

            // Retrieve user info/verify user session is still valid
            req.user = await req.oidc.fetchUserInfo().catch(() => {
                res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/login`);
            });

            if(!req.user) {
                return;
            }
        }

        // Check if user is authorized by a service
        if(internal || oidc) {
            // Remove req.oidc if user is authenticated internally
            if(internal) {
                delete req.oidc;
            }

            next();
            return;
        }

        // Fallback to login page
        res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/login`);
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
        if(!variables.authDisabled) {
            // Check if user has sent the authorization header
            if (!req.headers.authorization) {
                res.status(401).json({
                    error: 'Unauthorized',
                    data: {}
                });
                return;
            }

            // Check if password is correct
            const passwordCheck = req.headers.authorization === `Bearer ${variables.authToken}`;
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

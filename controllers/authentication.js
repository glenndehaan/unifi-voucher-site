/**
 * Import own modules
 */
const variables = require('../modules/variables');
const jwt = require('../modules/jwt');

module.exports = {
    login: {
        /**
         * GET - /login
         *
         * @param req
         * @param res
         */
        get: (req, res) => {
            // Check if authentication is disabled
            if (variables.authDisabled) {
                res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                return;
            }

            const hour = new Date().getHours();
            const timeHeader = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

            res.render('login', {
                baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
                error: req.flashMessage.type === 'error',
                error_text: req.flashMessage.message || '',
                app_header: timeHeader,
                internalAuth: variables.authInternalEnabled,
                oidcAuth: variables.authOidcEnabled
            });
        },

        /**
         * POST - /login
         *
         * @param req
         * @param res
         */
        post: async (req, res) => {
            // Check if internal authentication is enabled
            if(!variables.authInternalEnabled) {
                res.status(501).send();
                return;
            }

            if (typeof req.body === "undefined") {
                res.status(400).send();
                return;
            }

            const passwordCheck = req.body.password === variables.authInternalPassword;

            if (!passwordCheck) {
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Password Invalid!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/login`);
                return;
            }

            res.cookie('authorization', jwt.sign(), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
        }
    },

    logout: {
        /**
         * GET - /logout
         *
         * @param req
         * @param res
         */
        get: (req, res) => {
            // Check if authentication is disabled
            if (variables.authDisabled) {
                res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                return;
            }

            if(req.oidc) {
                res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/oidc/logout`);
            } else {
                res.cookie('authorization', '', {httpOnly: true, expires: new Date(0)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/`);
            }
        }
    }
};

/**
 * Import base packages
 */
const crypto = require('crypto');
const oidc = require('express-openid-connect');

/**
 * Import own modules
 */
const log = require('./log');

/**
 * OIDC Settings
 *
 * @type {{baseURL: string, idpLogout: boolean, authRequired: boolean, clientID: string, issuerBaseURL: string, clientSecret: string, secret: string, authorizationParams: {scope: string, response_type: (string), response_mode: (string)}}}
 */
const settings = {
    issuerBaseURL: process.env.AUTH_OIDC_ISSUER_BASE_URL,
    baseURL: process.env.AUTH_OIDC_APP_BASE_URL,
    clientID: process.env.AUTH_OIDC_CLIENT_ID,
    clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET,
    secret: '',
    idpLogout: true,
    authRequired: false,
    authorizationParams: {
        response_type: (process.env.AUTH_OIDC_CLIENT_TYPE === 'confidential') ? 'code' : 'id_token',
        response_mode: (process.env.AUTH_OIDC_CLIENT_TYPE === 'confidential') ? 'query' : 'form_post',
        scope: 'openid profile email'
    }
};

/**
 * Exports the OIDC functions
 */
module.exports = {
    /**
     * Set the OIDC secret & setup OIDC middleware
     *
     * @param app
     */
    init: (app) => {
        settings.secret = crypto.randomBytes(20).toString('hex');
        log.info(`[OIDC] Set secret: ${settings.secret}`);
        app.use(oidc.auth(settings));
        log.info(`[OIDC] Issuer: ${settings.issuerBaseURL}, Client: ${settings.clientID}, Type: ${process.env.AUTH_OIDC_CLIENT_TYPE || 'public'}`);
    }
};

/**
 * Import base packages
 */
const crypto = require('crypto');
const oidc = require('express-openid-connect');

/**
 * Import own modules
 */
const variables = require('./variables');
const log = require('./log');

/**
 * OIDC Settings
 */
const settings = {
    issuerBaseURL: variables.authOidcIssuerBaseUrl,
    baseURL: variables.authOidcAppBaseUrl,
    clientID: variables.authOidcClientId,
    clientSecret: variables.authOidcClientSecret,
    secret: '',
    idpLogout: true,
    authRequired: false,
    authorizationParams: {
        response_type: 'code',
        response_mode: 'query',
        scope: 'openid profile email'
    },
    routes: {
        callback: '/oidc/callback',
        login: '/oidc/login',
        logout: '/oidc/logout'
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
        log.info(`[OIDC] Issuer: ${settings.issuerBaseURL}, Client: ${settings.clientID}`);
    }
};

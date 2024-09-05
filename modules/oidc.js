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
 *
 * @type {{baseURL: string, idpLogout: boolean, authRequired: boolean, clientID: string, issuerBaseURL: string, clientSecret: string, secret: string, authorizationParams: {scope: string, response_type: (string), response_mode: (string)}}}
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
        response_type: (variables.authOidcClientType === 'confidential') ? 'code' : 'id_token',
        response_mode: (variables.authOidcClientType === 'confidential') ? 'query' : 'form_post',
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
        log.info(`[OIDC] Issuer: ${settings.issuerBaseURL}, Client: ${settings.clientID}, Type: ${variables.authOidcClientType}`);
    }
};

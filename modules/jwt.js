/**
 * Import base packages
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Import own modules
 */
const log = require('./log');

/**
 * JWT Settings
 *
 * @type {{expiresIn: string, secret: string, algorithm: string}}
 */
const settings = {
    algorithm: 'HS512',
    secret: '',
    expiresIn: '24h'
};

/**
 * Exports the JWT functions
 */
module.exports = {
    /**
     * Set the JWT secret
     */
    init: () => {
        settings.secret = crypto.randomBytes(20).toString('hex');
        log.info(`[JWT] Set secret: ${settings.secret}`);
    },

    /**
     * Sign a payload and return a JWT token
     *
     * @param payload
     * @return {*}
     */
    sign: (payload = {}) => {
        return jwt.sign(payload, settings.secret, {
            algorithm: settings.algorithm,
            expiresIn: settings.expiresIn
        });
    },

    /**
     * Verify a JWT token
     *
     * @param token
     * @return {*}
     */
    verify: (token) => {
        return jwt.verify(token, settings.secret);
    }
};

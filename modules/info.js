/**
 * Import base packages
 */
const fs = require('fs');

/**
 * Import own modules
 */
const variables = require('./variables');
const log = require('./log');

/**
 * Import own utils
 */
const array = require('../utils/array');
const logo = require('../utils/logo');
const types = require('../utils/types');
const time = require('../utils/time');
const languages = require('../utils/languages');

/**
 * Output info to console
 */
module.exports = () => {
    /**
     * Output logo
     */
    logo();

    /**
     * Check for deprecated strings
     */
    array.deprecated.forEach((item) => {
        if(typeof process.env[item] !== 'undefined') {
            log.warn(`[Deprecation] '${item}' has been deprecated! Please remove this item from the environment variables and/or follow migration guides: https://github.com/glenndehaan/unifi-voucher-site#migration-guide`);
        }
    });

    /**
     * Output build version
     */
    log.info(`[Version] Git: ${variables.gitTag} - Build: ${variables.gitBuild}`);

    /**
     * Log external config
     */
    if (fs.existsSync('/data/options.json')) {
        log.info('[Options] Found at /data/options.json');
    }
    if (fs.existsSync(`${process.cwd()}/.options.json`)) {
        log.info(`[Options] Found at ${process.cwd()}/.options.json`);
    }

    /**
     * Check for incorrect translation default
     */
    if(!Object.keys(languages).includes(variables.translationDefault)) {
        log.error(`[Translations] Default language: '${variables.translationDefault}' doesn't exist!`);
    }

    /**
     * Log service status
     */
    log.info(`[Service][Web] ${variables.serviceWeb ? 'Enabled!' : 'Disabled!'}`);
    log.info(`[Service][Api] ${variables.serviceApi ? 'Enabled!' : 'Disabled!'}`);

    /**
     * Log voucher types
     */
    log.info('[Voucher] Loaded the following types:');
    types(variables.voucherTypes).forEach((type, key) => {
        log.info(`[Voucher][Type][${key}] ${time(type.expiration)}, ${type.usage === '1' ? 'single-use' : type.usage === '0' ? 'multi-use (unlimited)' : `multi-use (${type.usage}x)`}${typeof type.upload === "undefined" && typeof type.download === "undefined" && typeof type.megabytes === "undefined" ? ', no limits' : `${typeof type.upload !== "undefined" ? `, upload bandwidth limit: ${type.upload} kb/s` : ''}${typeof type.download !== "undefined" ? `, download bandwidth limit: ${type.download} kb/s` : ''}${typeof type.megabytes !== "undefined" ? `, quota limit: ${type.megabytes} mb` : ''}`}`);
    });
    log.info(`[Voucher][Custom] ${variables.voucherCustom ? 'Enabled!' : 'Disabled!'}`);

    /**
     * Log auth status
     */
    log.info(`[Auth] ${variables.authDisabled ? 'Disabled!' : `Enabled! Type: ${variables.authInternalEnabled ? 'Internal' : ''}${variables.authInternalEnabled && variables.authOidcEnabled ? ', ' : ''}${variables.authOidcEnabled ? 'OIDC' : ''}`}`);

    /**
     * Check auth services
     */
    if(!variables.authDisabled && !variables.authInternalEnabled && !variables.authOidcEnabled) {
        log.error(`[Auth] Incorrect Configuration Detected!. Authentication is enabled but all authentication services have been disabled`);
    }

    /**
     * Verify OIDC configuration
     */
    if(variables.authOidcEnabled && (variables.authOidcIssuerBaseUrl === '' || variables.authOidcAppBaseUrl === '' || variables.authOidcClientId === '' || variables.authOidcClientSecret === '')) {
        log.error(`[OIDC] Incorrect Configuration Detected!. Verify 'AUTH_OIDC_ISSUER_BASE_URL', 'AUTH_OIDC_APP_BASE_URL', 'AUTH_OIDC_CLIENT_ID' and 'AUTH_OIDC_CLIENT_SECRET' are set! Authentication will be unstable or disabled until issue is resolved!`);
    }

    /**
     * Log printer status
     */
    log.info(`[Printers] ${variables.printers !== '' ? `Enabled! Available: ${variables.printers.split(',').join(', ')}` : 'Disabled!'}`);

    /**
     * Log email status
     */
    if(variables.smtpFrom !== '' && variables.smtpHost !== '' && variables.smtpPort !== '') {
        log.info(`[Email] Enabled! SMTP Server: ${variables.smtpHost}:${variables.smtpPort}`);
    } else {
        log.info(`[Email] Disabled!`);
    }

    /**
     * Log kiosk status
     */
    if(variables.kioskEnabled) {
        const kioskType = types(variables.kioskVoucherType, true);
        log.info('[Kiosk] Enabled!');
        log.info(`[Kiosk][Type] ${time(kioskType.expiration)}, ${kioskType.usage === '1' ? 'single-use' : kioskType.usage === '0' ? 'multi-use (unlimited)' : `multi-use (${kioskType.usage}x)`}${typeof kioskType.upload === "undefined" && typeof kioskType.download === "undefined" && typeof kioskType.megabytes === "undefined" ? ', no limits' : `${typeof kioskType.upload !== "undefined" ? `, upload bandwidth limit: ${kioskType.upload} kb/s` : ''}${typeof kioskType.download !== "undefined" ? `, download bandwidth limit: ${kioskType.download} kb/s` : ''}${typeof kioskType.megabytes !== "undefined" ? `, quota limit: ${kioskType.megabytes} mb` : ''}`}`);
    }

    /**
     * Log controller
     */
    log.info(`[UniFi] Using Controller on: ${variables.unifiIp}:${variables.unifiPort} (Site ID: ${variables.unifiSiteId}${variables.unifiSsid !== '' ? `, SSID: ${variables.unifiSsid}` : ''})`);

    /**
     * Check for valid UniFi username
     */
    if(variables.unifiUsername.includes('@')) {
        log.error('[UniFi] Incorrect username detected! UniFi Cloud credentials are not supported!');
    }
};

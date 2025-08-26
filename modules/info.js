/**
 * Import base packages
 */
const fs = require('fs');

/**
 * Import own modules
 */
const variables = require('./variables');
const config = require('./config');
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

        if(config(item.toLowerCase()) !== null) {
            log.warn(`[Deprecation] '${item.toLowerCase()}' has been deprecated! Please remove this item from the options file and/or follow migration guides: https://github.com/glenndehaan/unifi-voucher-site#migration-guide`);
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
     * Log translation status
     */
    log.info(`[Translation] Default Language: ${variables.translationDefault}${variables.translationDebug ? ', Debugger: Enabled' : ', Debugger: Disabled'}${variables.translationHiddenLanguages !== '' ? `, Hidden Languages: ${variables.translationHiddenLanguages}` : ''}`)

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
        log.info(`[Kiosk] Enabled! ${variables.kioskNameRequired ? '(Guest Name Required!)' : ''}`);
        types(variables.kioskVoucherTypes).forEach((type, key) => {
            log.info(`[Kiosk][Type][${key}] ${time(type.expiration)}, ${type.usage === '1' ? 'single-use' : type.usage === '0' ? 'multi-use (unlimited)' : `multi-use (${type.usage}x)`}${typeof type.upload === "undefined" && typeof type.download === "undefined" && typeof type.megabytes === "undefined" ? ', no limits' : `${typeof type.upload !== "undefined" ? `, upload bandwidth limit: ${type.upload} kb/s` : ''}${typeof type.download !== "undefined" ? `, download bandwidth limit: ${type.download} kb/s` : ''}${typeof type.megabytes !== "undefined" ? `, quota limit: ${type.megabytes} mb` : ''}`}`);
        });
        if(variables.kioskPrinter !== '') {
            log.info(`[Kiosk] Auto-printing enabled! Printer: ${variables.kioskPrinter}`);
        }
    }

    /**
     * Log controller
     */
    log.info(`[UniFi] Using Controller on: ${variables.unifiIp}:${variables.unifiPort} (Site ID: ${variables.unifiSiteId}${variables.unifiSsid !== '' ? `, SSID: ${variables.unifiSsid}` : ''})`);

    /**
     * Check if UniFi Token is set
     */
    if(variables.unifiToken === '') {
        log.error('[UniFi] Integration API Key is not set within UNIFI_TOKEN environment variable!');
        process.exit(1);
    }

    /**
     * Temporary warning that guests lookup feature is unavailable
     */
    log.warn('[UniFi] Guests features are temporary disabled in this version of UniFi Voucher Site (Not supported in current Integrations API). Please view and upvote: https://community.ui.com/questions/Feature-Request-Network-API-Guest-Access-Voucher-ID/d3c470e2-433d-4386-8a13-211712311202')
};

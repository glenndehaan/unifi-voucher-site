/**
 * Import base packages
 */
const fs = require('fs');

/**
 * Import own modules
 */
const variables = require('./variables');
const log = require('./log');
const logo = require('../utils/logo');
const types = require('../utils/types');
const time = require('../utils/time');

/**
 * Output info to console
 */
module.exports = () => {
    /**
     * Output logo
     */
    logo();

    /**
     * Output build version
     */
    if(fs.existsSync('/etc/unifi_voucher_site_build')) {
        log.info(`[Version] ${fs.readFileSync('/etc/unifi_voucher_site_build', 'utf-8')}`);
    } else {
        log.info(`[Version] **DEVELOPMENT**`);
    }

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
     * Log service status
     */
    log.info(`[Service][Web] ${variables.serviceWeb ? 'Enabled!' : 'Disabled!'}`);
    log.info(`[Service][Api] ${variables.serviceApi ? 'Enabled!' : 'Disabled!'}`);

    /**
     * Log voucher types
     */
    log.info('[Voucher] Loaded the following types:');
    types(variables.voucherTypes).forEach((type, key) => {
        log.info(`[Voucher][Type][${key}] ${time(type.expiration)}, ${type.usage === '1' ? 'single-use' : 'multi-use'}${typeof type.upload === "undefined" && typeof type.download === "undefined" && typeof type.megabytes === "undefined" ? ', no limits' : `${typeof type.upload !== "undefined" ? `, upload bandwidth limit: ${type.upload} kb/s` : ''}${typeof type.download !== "undefined" ? `, download bandwidth limit: ${type.download} kb/s` : ''}${typeof type.megabytes !== "undefined" ? `, quota limit: ${type.megabytes} mb` : ''}`}`);
    });
    log.info(`[Voucher][Custom] ${variables.voucherCustom ? 'Enabled!' : 'Disabled!'}`);

    /**
     * Log auth status
     */
    log.info(`[Auth] ${variables.authDisabled ? 'Disabled!' : `Enabled! Type: ${(variables.authOidcIssuerBaseUrl !== '' || variables.authOidcAppBaseUrl !== '' || variables.authOidcClientId !== '') ? 'OIDC' : 'Internal'}`}`);

    /**
     * Verify OIDC configuration
     */
    if(variables.authOidcIssuerBaseUrl !== '' && (variables.authOidcAppBaseUrl === '' || variables.authOidcClientId === '')) {
        log.error(`[OIDC] Incorrect Configuration Detected!. Verify 'AUTH_OIDC_ISSUER_BASE_URL', 'AUTH_OIDC_APP_BASE_URL' and 'AUTH_OIDC_CLIENT_ID' are set! Authentication will be unstable or disabled until issue is resolved!`);
    }
    if(variables.authOidcIssuerBaseUrl !== '' && variables.authOidcClientType === 'confidential' && variables.authOidcClientSecret === '') {
        log.error(`[OIDC] Incorrect Configuration Detected!. Verify 'AUTH_OIDC_CLIENT_SECRET' is set! Authentication will be unstable or disabled until issue is resolved!`);
    }

    /**
     * Log printer status
     */
    log.info(`[Printer] ${variables.printerType !== '' ? `Enabled! Type: ${variables.printerType}${variables.printerType === 'escpos' ? `, IP: ${variables.printerIp}` : ''}` : 'Disabled!'}`);

    /**
     * Log email status
     */
    if(variables.smtpFrom !== '' && variables.smtpHost !== '' && variables.smtpPort !== '') {
        log.info(`[Email] Enabled! SMTP Server: ${variables.smtpHost}:${variables.smtpPort}`);
    } else {
        log.info(`[Email] Disabled!`);
    }

    /**
     * Log controller
     */
    log.info(`[UniFi] Using Controller on: ${variables.unifiIp}:${variables.unifiPort} (Site ID: ${variables.unifiSiteId})`);
};

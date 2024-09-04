/**
 * Import base packages
 */
const fs = require('fs');

/**
 * Import own modules
 */
const log = require('./log');
const config = require('./config');
const logo = require('../utils/logo');
const types = require('../utils/types');
const time = require('../utils/time');

/**
 * Define global variables
 */
const voucherTypes = types(config('voucher_types') || process.env.VOUCHER_TYPES || '480,1,,,;');
const voucherCustom = config('voucher_custom') !== null ? config('voucher_custom') : process.env.VOUCHER_CUSTOM ? process.env.VOUCHER_CUSTOM !== 'false' : true;
const webService = process.env.SERVICE_WEB ? process.env.SERVICE_WEB !== 'false' : true;
const apiService = config('service_api') || (process.env.SERVICE_API === 'true') || false;
const authDisabled = (process.env.AUTH_DISABLE === 'true') || false;
const printerType = config('printer_type') || process.env.PRINTER_TYPE || '';
const printerIp = config('printer_ip') || process.env.PRINTER_IP || '192.168.1.1';
const smtpFrom = config('smtp_from') || process.env.SMTP_FROM || '';
const smtpHost = config('smtp_host') || process.env.SMTP_HOST || '';
const smtpPort = config('smtp_port') || process.env.SMTP_PORT || 25;
const oidcIssuerBaseUrl = process.env.AUTH_OIDC_ISSUER_BASE_URL || '';
const oidcAppBaseUrl = process.env.AUTH_OIDC_APP_BASE_URL || '';
const oidcClientId = process.env.AUTH_OIDC_CLIENT_ID || '';
const oidcClientType = process.env.AUTH_OIDC_CLIENT_TYPE || 'public';
const oidcClientSecret = process.env.AUTH_OIDC_CLIENT_SECRET || '';

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
    log.info(`[Service][Web] ${webService ? 'Enabled!' : 'Disabled!'}`);
    log.info(`[Service][Api] ${apiService ? 'Enabled!' : 'Disabled!'}`);

    /**
     * Log voucher types
     */
    log.info('[Voucher] Loaded the following types:');
    voucherTypes.forEach((type, key) => {
        log.info(`[Voucher][Type][${key}] ${time(type.expiration)}, ${type.usage === '1' ? 'single-use' : 'multi-use'}${typeof type.upload === "undefined" && typeof type.download === "undefined" && typeof type.megabytes === "undefined" ? ', no limits' : `${typeof type.upload !== "undefined" ? `, upload bandwidth limit: ${type.upload} kb/s` : ''}${typeof type.download !== "undefined" ? `, download bandwidth limit: ${type.download} kb/s` : ''}${typeof type.megabytes !== "undefined" ? `, quota limit: ${type.megabytes} mb` : ''}`}`);
    });
    log.info(`[Voucher][Custom] ${voucherCustom ? 'Enabled!' : 'Disabled!'}`);

    /**
     * Log auth status
     */
    log.info(`[Auth] ${authDisabled ? 'Disabled!' : `Enabled! Type: ${(oidcIssuerBaseUrl !== '' || oidcAppBaseUrl !== '' || oidcClientId !== '') ? 'OIDC' : 'Internal'}`}`);

    /**
     * Verify OIDC configuration
     */
    if(oidcIssuerBaseUrl !== '' && (oidcAppBaseUrl === '' || oidcClientId === '')) {
        log.error(`[OIDC] Incorrect Configuration Detected!. Verify 'AUTH_OIDC_ISSUER_BASE_URL', 'AUTH_OIDC_APP_BASE_URL' and 'AUTH_OIDC_CLIENT_ID' are set! Authentication will be unstable or disabled until issue is resolved!`);
    }
    if(oidcIssuerBaseUrl !== '' && oidcClientType === 'confidential' && oidcClientSecret === '') {
        log.error(`[OIDC] Incorrect Configuration Detected!. Verify 'AUTH_OIDC_CLIENT_SECRET' is set! Authentication will be unstable or disabled until issue is resolved!`);
    }

    /**
     * Log printer status
     */
    log.info(`[Printer] ${printerType !== '' ? `Enabled! Type: ${printerType}${printerType === 'escpos' ? `, IP: ${printerIp}` : ''}` : 'Disabled!'}`);

    /**
     * Log email status
     */
    if(smtpFrom !== '' && smtpHost !== '' && smtpPort !== '') {
        log.info(`[Email] Enabled! SMTP Server: ${smtpHost}:${smtpPort}`);
    } else {
        log.info(`[Email] Disabled!`);
    }

    /**
     * Log controller
     */
    log.info(`[UniFi] Using Controller on: ${config('unifi_ip') || process.env.UNIFI_IP || '192.168.1.1'}:${config('unifi_port') || process.env.UNIFI_PORT || 443} (Site ID: ${config('unifi_site_id') || process.env.UNIFI_SITE_ID || 'default'})`);
};

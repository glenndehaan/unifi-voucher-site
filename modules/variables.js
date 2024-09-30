/**
 * Import own modules
 */
const config = require('./config');

/**
 * Exports all global variables used within the application
 */
module.exports = {
    unifiIp: config('unifi_ip') || process.env.UNIFI_IP || '192.168.1.1',
    unifiPort: config('unifi_port') || process.env.UNIFI_PORT || 443,
    unifiUsername: config('unifi_username') || process.env.UNIFI_USERNAME || 'admin',
    unifiPassword: config('unifi_password') || process.env.UNIFI_PASSWORD || 'password',
    unifiSiteId: config('unifi_site_id') || process.env.UNIFI_SITE_ID || 'default',
    unifiSsid: config('unifi_ssid') || process.env.UNIFI_SSID || '',
    unifiSsidPassword: config('unifi_ssid_password') || process.env.UNIFI_SSID_PASSWORD || '',
    voucherTypes: config('voucher_types') || process.env.VOUCHER_TYPES || '480,1,,,;',
    voucherCustom: config('voucher_custom') !== null ? config('voucher_custom') : process.env.VOUCHER_CUSTOM ? process.env.VOUCHER_CUSTOM !== 'false' : true,
    serviceWeb: process.env.SERVICE_WEB ? process.env.SERVICE_WEB !== 'false' : true,
    serviceApi: config('service_api') || (process.env.SERVICE_API === 'true') || false,
    authInternalPassword: process.env.AUTH_INTERNAL_PASSWORD || '0000',
    authToken: process.env.AUTH_TOKEN || '0000',
    authOidcIssuerBaseUrl: process.env.AUTH_OIDC_ISSUER_BASE_URL || '',
    authOidcAppBaseUrl: process.env.AUTH_OIDC_APP_BASE_URL || '',
    authOidcClientId: process.env.AUTH_OIDC_CLIENT_ID || '',
    authOidcClientType: process.env.AUTH_OIDC_CLIENT_TYPE || 'public',
    authOidcClientSecret: process.env.AUTH_OIDC_CLIENT_SECRET || '',
    authDisabled: (process.env.AUTH_DISABLE === 'true') || false,
    printerType: config('printer_type') || process.env.PRINTER_TYPE || '',
    printerIp: config('printer_ip') || process.env.PRINTER_IP || '192.168.1.1',
    smtpFrom: config('smtp_from') || process.env.SMTP_FROM || '',
    smtpHost: config('smtp_host') || process.env.SMTP_HOST || '',
    smtpPort: config('smtp_port') || process.env.SMTP_PORT || 25,
    smtpSecure: config('smtp_secure') || process.env.SMTP_SECURE || false,
    smtpUsername: config('smtp_username') || process.env.SMTP_USERNAME || '',
    smtpPassword: config('smtp_password') || process.env.SMTP_PASSWORD || '',
    logLevel: config('log_level') || process.env.LOG_LEVEL || 'info'
};

/**
 * Import own modules
 */
const config = require('../modules/config');

/**
 * Define global variables
 */
const webService = process.env.SERVICE_WEB ? process.env.SERVICE_WEB !== 'false' : true;
const apiService = config('service_api') || (process.env.SERVICE_API === 'true') || false;
const printerType = config('printer_type') || process.env.PRINTER_TYPE || '';
const printerIp = config('printer_ip') || process.env.PRINTER_IP || '192.168.1.1';
const smtpFrom = config('smtp_from') || process.env.SMTP_FROM || '';
const smtpHost = config('smtp_host') || process.env.SMTP_HOST || '';
const smtpPort = config('smtp_port') || process.env.SMTP_PORT || 25;
const authDisabled = (process.env.AUTH_DISABLE === 'true') || false;
const oidcIssuerBaseUrl = process.env.AUTH_OIDC_ISSUER_BASE_URL || '';
const oidcAppBaseUrl = process.env.AUTH_OIDC_APP_BASE_URL || '';
const oidcClientId = process.env.AUTH_OIDC_CLIENT_ID || '';

/**
 * Util to return status of all application components and features
 *
 * @return {{}}
 */
module.exports = () => {
    return {
        app: {
            status: {
                text: webService || apiService ? 'Enabled' : 'Disabled',
                state: webService || apiService ? 'green' : 'red'
            },
            details: webService || apiService ? 'Service has been configured.' : 'No services enabled.',
            info: 'https://github.com/glenndehaan/unifi-voucher-site#services',
            modules: {
                web: {
                    status: {
                        text: webService ? 'Enabled' : 'Disabled',
                        state: webService ? 'green' : 'red'
                    },
                    details: webService || apiService ? 'Service running on http://0.0.0.0:3000.' : 'Web service not enabled.',
                    info: 'https://github.com/glenndehaan/unifi-voucher-site#web-service'
                },
                api: {
                    status: {
                        text: apiService ? 'Enabled' : 'Disabled',
                        state: apiService ? 'green' : 'red'
                    },
                    details: webService || apiService ? 'Service running on http://0.0.0.0:3000/api.' : 'Api service not enabled.',
                    info: 'https://github.com/glenndehaan/unifi-voucher-site#api-service'
                }
            }
        },
        unifi: {
            status: {
                text: 'Enabled',
                state: 'green'
            },
            details: `UniFi Voucher is connected with UniFi on: ${config('unifi_ip') || process.env.UNIFI_IP || '192.168.1.1'}:${config('unifi_port') || process.env.UNIFI_PORT || 443}.`,
            info: 'https://github.com/glenndehaan/unifi-voucher-site#prerequisites',
            modules: {}
        },
        printing: {
            status: {
                text: printerType !== '' ? 'Enabled' : 'Disabled',
                state: printerType !== '' ? 'green' : 'red'
            },
            details: printerType !== '' ? 'Printing service has been configured.' : 'No printing service enabled.',
            info: 'https://github.com/glenndehaan/unifi-voucher-site#print-functionality',
            modules: {
                pdf: {
                    status: {
                        text: printerType === 'pdf' ? 'Enabled' : 'Disabled',
                        state: printerType === 'pdf' ? 'green' : 'red'
                    },
                    details: printerType === 'pdf' ? 'PDF Service enabled.' : 'PDF Service not enabled.',
                    info: 'https://github.com/glenndehaan/unifi-voucher-site#pdf'
                },
                escpos: {
                    status: {
                        text: printerType === 'escpos' ? 'Enabled' : 'Disabled',
                        state: printerType === 'escpos' ? 'green' : 'red'
                    },
                    details: printerType === 'escpos' ? `ESC/POS Printing on ${printerIp}.` : 'ESC/POS Service not enabled.',
                    info: 'https://github.com/glenndehaan/unifi-voucher-site#escpos'
                }
            }
        },
        email: {
            status: {
                text: (smtpFrom !== '' && smtpHost !== '' && smtpPort !== '') ? 'Enabled' : 'Disabled',
                state: (smtpFrom !== '' && smtpHost !== '' && smtpPort !== '') ? 'green' : 'red'
            },
            details: (smtpFrom !== '' && smtpHost !== '' && smtpPort !== '') ? `Email service sending to ${smtpHost}:${smtpPort}.` : 'Email service not enabled.',
            info: 'https://github.com/glenndehaan/unifi-voucher-site#email-functionality',
            modules: {}
        },
        authentication: {
            status: {
                text: !authDisabled ? 'Enabled' : 'Disabled',
                state: !authDisabled ? 'green' : 'red'
            },
            details: !authDisabled ? 'Authentication service has been configured.' : 'Authentication has been disabled.',
            info: 'https://github.com/glenndehaan/unifi-voucher-site#authentication',
            modules: {
                internal: {
                    status: {
                        text: (oidcIssuerBaseUrl === '' && oidcAppBaseUrl === '' && oidcClientId === '') ? 'Enabled' : 'Disabled',
                        state: (oidcIssuerBaseUrl === '' && oidcAppBaseUrl === '' && oidcClientId === '') ? 'green' : 'red'
                    },
                    details: (oidcIssuerBaseUrl === '' && oidcAppBaseUrl === '' && oidcClientId === '') ? 'Internal Authentication enabled.' : 'Internal Authentication not enabled.',
                    info: 'https://github.com/glenndehaan/unifi-voucher-site#1-internal-authentication-default'
                },
                oidc: {
                    status: {
                        text: (oidcIssuerBaseUrl !== '' && oidcAppBaseUrl !== '' && oidcClientId !== '') ? 'Enabled' : 'Disabled',
                        state: (oidcIssuerBaseUrl !== '' && oidcAppBaseUrl !== '' && oidcClientId !== '') ? 'green' : 'red'
                    },
                    details: (oidcIssuerBaseUrl !== '' && oidcAppBaseUrl !== '' && oidcClientId !== '') ? `OIDC Authentication via ${oidcIssuerBaseUrl}.` : 'OIDC Authentication not enabled.',
                    info: 'https://github.com/glenndehaan/unifi-voucher-site#2-openid-connect-oidc-authentication'
                }
            }
        }
    };
}

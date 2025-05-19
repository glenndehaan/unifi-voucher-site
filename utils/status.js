/**
 * Import own modules
 */
const variables = require('../modules/variables');

/**
 * Util to return status of all application components and features
 *
 * @return {{}}
 */
module.exports = () => {
    return {
        app: {
            status: {
                text: variables.serviceWeb || variables.serviceApi ? 'Enabled' : 'Disabled',
                state: variables.serviceWeb || variables.serviceApi ? 'green' : 'red'
            },
            details: variables.serviceWeb || variables.serviceApi ? 'Service has been configured.' : 'No services enabled.',
            info: 'https://github.com/glenndehaan/unifi-voucher-site#services',
            modules: {
                web: {
                    status: {
                        text: variables.serviceWeb ? 'Enabled' : 'Disabled',
                        state: variables.serviceWeb ? 'green' : 'red'
                    },
                    details: variables.serviceWeb || variables.serviceApi ? 'Service running on http://0.0.0.0:3000.' : 'Web service not enabled.',
                    info: 'https://github.com/glenndehaan/unifi-voucher-site#web-service'
                },
                api: {
                    status: {
                        text: variables.serviceApi ? 'Enabled' : 'Disabled',
                        state: variables.serviceApi ? 'green' : 'red'
                    },
                    details: variables.serviceWeb || variables.serviceApi ? 'Service running on http://0.0.0.0:3000/api.' : 'Api service not enabled.',
                    info: 'https://github.com/glenndehaan/unifi-voucher-site#api-service'
                }
            }
        },
        unifi: {
            status: {
                text: 'Enabled',
                state: 'green'
            },
            details: `UniFi Voucher is connected with UniFi on: ${variables.unifiIp}:${variables.unifiPort}.`,
            info: 'https://github.com/glenndehaan/unifi-voucher-site#prerequisites',
            modules: {}
        },
        printing: {
            status: {
                text: variables.printers !== '' ? 'Enabled' : 'Disabled',
                state: variables.printers !== '' ? 'green' : 'red'
            },
            details: variables.printers !== '' ? `Printing service has been configured. Available printers: ${variables.printers.split(',').join(', ')}` : 'No printing service enabled.',
            info: 'https://github.com/glenndehaan/unifi-voucher-site#print-functionality',
            modules: {}
        },
        email: {
            status: {
                text: (variables.smtpFrom !== '' && variables.smtpHost !== '' && variables.smtpPort !== '') ? 'Enabled' : 'Disabled',
                state: (variables.smtpFrom !== '' && variables.smtpHost !== '' && variables.smtpPort !== '') ? 'green' : 'red'
            },
            details: (variables.smtpFrom !== '' && variables.smtpHost !== '' && variables.smtpPort !== '') ? `Email service sending to ${variables.smtpHost}:${variables.smtpPort}.` : 'Email service not enabled.',
            info: 'https://github.com/glenndehaan/unifi-voucher-site#email-functionality',
            modules: {}
        },
        kiosk: {
            status: {
                text: variables.kioskEnabled ? 'Enabled' : 'Disabled',
                state: variables.kioskEnabled ? 'green' : 'red'
            },
            details: variables.kioskEnabled ? `Kiosk service enabled on http://0.0.0.0:3000/kiosk.` : 'Kiosk service not enabled.',
            info: 'https://github.com/glenndehaan/unifi-voucher-site#kiosk-functionality',
            modules: {}
        },
        authentication: {
            status: {
                text: !variables.authDisabled ? 'Enabled' : 'Disabled',
                state: !variables.authDisabled ? 'green' : 'red'
            },
            details: !variables.authDisabled ? 'Authentication service has been configured.' : 'Authentication has been disabled.',
            info: 'https://github.com/glenndehaan/unifi-voucher-site#authentication',
            modules: {
                internal: {
                    status: {
                        text: (!variables.authDisabled && variables.authInternalEnabled) ? 'Enabled' : 'Disabled',
                        state: (!variables.authDisabled && variables.authInternalEnabled) ? 'green' : 'red'
                    },
                    details: (!variables.authDisabled && variables.authInternalEnabled) ? 'Internal Authentication enabled.' : 'Internal Authentication not enabled.',
                    info: 'https://github.com/glenndehaan/unifi-voucher-site#1-internal-authentication-default'
                },
                oidc: {
                    status: {
                        text: (!variables.authDisabled && variables.authOidcEnabled) ? 'Enabled' : 'Disabled',
                        state: (!variables.authDisabled && variables.authOidcEnabled) ? 'green' : 'red'
                    },
                    details: (!variables.authDisabled && variables.authOidcEnabled) ? `OIDC Authentication via ${variables.authOidcIssuerBaseUrl}.` : 'OIDC Authentication not enabled.',
                    info: 'https://github.com/glenndehaan/unifi-voucher-site#2-openid-connect-oidc-authentication'
                }
            }
        }
    };
}

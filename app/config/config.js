/**
 * General config
 */
module.exports = {
    application: {
        name: "UniFi Voucher",
        env: " (local)",
        basePath: "/",
        port: 3001,
        bind: "0.0.0.0"
    },
    security: {
        code: process.env.SECURITY_CODE || "0000" // <- Only 4 digits
    },
    unifi: {
        ip: process.env.UNIFI_IP || '192.168.1.1',
        port: process.env.UNIFI_PORT || 8443,
        username: process.env.UNIFI_USERNAME || 'admin',
        password: process.env.UNIFI_PASSWORD || 'password',
        siteID: process.env.UNIFI_SITE_ID || 'default'
    }
};

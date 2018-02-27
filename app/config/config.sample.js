/**
 * General config
 */
const config = {
    application: {
        name: "UniFi Voucher",
        env: " (local)",
        basePath: "/",
        port: 3001,
        bind: "0.0.0.0",
        supportedBrowsers: [
            "Chrome >= 52",
            "Firefox >= 47",
            "Safari >= 10",
            "Edge == All",
            "IE == 11"
        ]
    },
    session: {
        secret: "averysecretstring"
    },
    security: {
        code: "0000" // <- Only 4 digits
    },
    unifi: {
        ip: '192.168.1.XX',
        port: 8443,
        username: 'admin',
        password: 'XXXXXXXXXXXXXXXXXXX',
        siteID: 'default'
    }
};

module.exports = config;

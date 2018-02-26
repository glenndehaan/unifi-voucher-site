/**
 * General config
 */
const config = {
    application: {
        name: "NodeExpress",
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
    }
};

module.exports = config;

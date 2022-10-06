/**
 * Import vendor modules
 */
const unifi = require('node-unifi');

/**
 * Import own modules
 */
const config = {
    unifi: {
        ip: process.env.UNIFI_IP || '192.168.1.1',
        port: process.env.UNIFI_PORT || 443,
        username: process.env.UNIFI_USERNAME || 'admin',
        password: process.env.UNIFI_PASSWORD || 'password',
        siteID: process.env.UNIFI_SITE_ID || 'default'
    }
};

/**
 * Create new UniFi controller object
 *
 * @type {Controller}
 */
const controller = new unifi.Controller({host: config.unifi.ip, port: config.unifi.port, site: config.unifi.siteID, sslverify: false});

/**
 * Exports the UniFi voucher function
 *
 * @returns {Promise<unknown>}
 */
module.exports = () => {
    return new Promise((resolve) => {
        controller.login(config.unifi.username, config.unifi.password).then(() => {
            controller.getSitesStats().then(() => {
                controller.createVouchers(480).then((voucher_data) => {
                    controller.getVouchers(voucher_data[0].create_time).then((voucher_data_complete) => {
                        const voucher = `${[voucher_data_complete[0].code.slice(0, 5), '-', voucher_data_complete[0].code.slice(5)].join('')}`;
                        resolve(voucher);
                    }).catch((e) => {
                        console.log(e);
                        process.exit(1);
                    });
                }).catch((e) => {
                    console.log(e);
                    process.exit(1);
                });
            }).catch((e) => {
                console.log(e);
                process.exit(1);
            });
        }).catch((e) => {
            console.log(e);
            process.exit(1);
        });
    });
};

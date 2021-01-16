/**
 * Import vendor modules
 */
const unifi = require('node-unifi');

/**
 * Import own modules
 */
const config = require('../config/config');

/**
 * Create new UniFi controller object
 *
 * @type {Controller}
 */
const controller = new unifi.Controller(config.unifi.ip, config.unifi.port);

/**
 * Exports the UniFi voucher function
 *
 * @param callback
 */
module.exports = (callback) => {
    controller.login(config.unifi.username, config.unifi.password, (err) => {
        if(err) {
            console.log(`[UNIFI] Error: ${err}`);
            callback(false);
            return;
        }

        // CREATE VOUCHER
        controller.createVouchers(config.unifi.siteID, 480, (err, voucher_data) => {
            if(err) {
                console.log(`[UNIFI] Error: ${err}`);
                callback(false);
                return;
            }

            // GET VOUCHER CODE
            controller.getVouchers(config.unifi.siteID, (err, voucher_data_complete) => {
                if(err) {
                    console.log(`[UNIFI] Error: ${err}`);
                    callback(false);
                    return;
                }

                const voucher = `${[voucher_data_complete[0][0].code.slice(0, 5), '-', voucher_data_complete[0][0].code.slice(5)].join('')}`;
                callback(voucher);

                controller.logout();
            }, voucher_data[0][0].create_time);
        }, 1, 1);
    });
};

/**
 * Import vendor modules
 */
const unifi = require('node-unifi');

/**
 * Import own modules
 */
const configProvider = require('./config');
const log = require('./log');

/**
 * Build config
 */
const config = {
    unifi: {
        ip: configProvider('unifi_ip') || process.env.UNIFI_IP || '192.168.1.1',
        port: configProvider('unifi_port') || process.env.UNIFI_PORT || 443,
        username: configProvider('unifi_username') || process.env.UNIFI_USERNAME || 'admin',
        password: configProvider('unifi_password') || process.env.UNIFI_PASSWORD || 'password',
        siteID: configProvider('unifi_site_id') || process.env.UNIFI_SITE_ID || 'default'
    }
};

/**
 * Controller session
 */
let controller = null;

/**
 * Start a UniFi controller reusable session
 *
 * @return {Promise<unknown>}
 */
const startSession = () => {
    return new Promise((resolve, reject) => {
        // Check if we have a current session already
        if(controller !== null) {
            resolve();
            return;
        }

        // Create new UniFi controller object
        controller = new unifi.Controller({
            host: config.unifi.ip,
            port: config.unifi.port,
            site: config.unifi.siteID,
            sslverify: false
        });

        // Login to UniFi Controller
        controller.login(config.unifi.username, config.unifi.password).then(() => {
            log.info('[UniFi] Login successful!');
            resolve();

            // Clear session after about 1 hour (bearer token will expire after 2 hours)
            setTimeout(async () => {
                log.info('[UniFi] Controller session timeout reached! Cleanup controller...');
                await controller.logout();
                controller = null;
            }, 3600000);
        }).catch((e) => {
            // Something went wrong so clear the current controller so a user can retry
            controller = null;
            log.error('[UniFi] Error while logging in!');
            log.error(e);
            reject('[UniFi] Error while logging in!');
        });
    });
}

/**
 * Exports the UniFi voucher functions
 *
 * @type {{create: (function(*): Promise<*>), list: (function(): Promise<*>)}}
 */
module.exports = {
    /**
     * Creates a new UniFi Voucher
     *
     * @param type
     * @param amount
     * @return {Promise<unknown>}
     */
    create: (type, amount = 1) => {
        return new Promise((resolve, reject) => {
            startSession().then(() => {
                controller.createVouchers(type.expiration, amount, parseInt(type.usage) === 1 ? 1 : 0, null, typeof type.upload !== "undefined" ? type.upload : null, typeof type.download !== "undefined" ? type.download : null, typeof type.megabytes !== "undefined" ? type.megabytes : null).then((voucher_data) => {
                    if(amount > 1) {
                        log.info(`[UniFi] Created ${amount} vouchers`);
                        resolve(true);
                    } else {
                        controller.getVouchers(voucher_data[0].create_time).then((voucher_data_complete) => {
                            const voucher = `${[voucher_data_complete[0].code.slice(0, 5), '-', voucher_data_complete[0].code.slice(5)].join('')}`;
                            log.info(`[UniFi] Created voucher with code: ${voucher}`);
                            resolve(voucher);
                        }).catch((e) => {
                            log.error('[UniFi] Error while getting voucher!');
                            log.error(e);
                            reject('[UniFi] Error while getting voucher!');
                        });
                    }
                }).catch((e) => {
                    log.error('[UniFi] Error while creating voucher!');
                    log.error(e);
                    reject('[UniFi] Error while creating voucher!');
                });
            }).catch((e) => {
                reject(e);
            });
        });
    },

    /**
     * Removes a UniFi Voucher
     *
     * @param id
     * @return {Promise<unknown>}
     */
    remove: (id) => {
        return new Promise((resolve, reject) => {
            startSession().then(() => {
                controller.revokeVoucher(id).then(() => {
                    resolve(true);
                }).catch((e) => {
                    log.error('[UniFi] Error while removing voucher!');
                    log.error(e);
                    reject('[UniFi] Error while removing voucher!');
                });
            }).catch((e) => {
                reject(e);
            });
        });
    },

    /**
     * Returns a list with all UniFi Vouchers
     *
     * @return {Promise<unknown>}
     */
    list: () => {
        return new Promise((resolve, reject) => {
            startSession().then(() => {
                controller.getVouchers().then((vouchers) => {
                    log.info(`[UniFi] Found ${vouchers.length} voucher(s)`);
                    resolve(vouchers);
                }).catch((e) => {
                    log.error('[UniFi] Error while getting vouchers!');
                    log.error(e);
                    reject('[UniFi] Error while getting vouchers!');
                });
            }).catch((e) => {
                reject(e);
            });
        });
    }
}

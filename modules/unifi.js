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
 * Exports the UniFi voucher functions
 *
 * @type {{create: (function(*): Promise<*>), list: (function(): Promise<*>)}}
 */
module.exports = {
    /**
     * Creates a new UniFi Voucher
     *
     * @param type
     * @return {Promise<unknown>}
     */
    create: (type) => {
        return new Promise((resolve, reject) => {
            /**
             * Create new UniFi controller object
             *
             * @type {Controller}
             */
            const controller = new unifi.Controller({
                host: config.unifi.ip,
                port: config.unifi.port,
                site: config.unifi.siteID,
                sslverify: false
            });

            /**
             * Login and create a voucher
             */
            controller.login(config.unifi.username, config.unifi.password).then(() => {
                controller.createVouchers(type.expiration, 1, parseInt(type.usage) === 1 ? 1 : 0, null, typeof type.upload !== "undefined" ? type.upload : null, typeof type.download !== "undefined" ? type.download : null, typeof type.megabytes !== "undefined" ? type.megabytes : null).then((voucher_data) => {
                    controller.getVouchers(voucher_data[0].create_time).then((voucher_data_complete) => {
                        const voucher = `${[voucher_data_complete[0].code.slice(0, 5), '-', voucher_data_complete[0].code.slice(5)].join('')}`;
                        log.info(`[UniFi] Created voucher with code: ${voucher}`);
                        resolve(voucher);
                    }).catch((e) => {
                        log.error('[UniFi] Error while getting voucher!');
                        log.error(e);
                        reject('[UniFi] Error while getting voucher!');
                    });
                }).catch((e) => {
                    log.error('[UniFi] Error while creating voucher!');
                    log.error(e);
                    reject('[UniFi] Error while creating voucher!');
                });
            }).catch((e) => {
                log.error('[UniFi] Error while logging in!');
                log.error(e);
                reject('[UniFi] Error while logging in!');
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
            /**
             * Create new UniFi controller object
             *
             * @type {Controller}
             */
            const controller = new unifi.Controller({
                host: config.unifi.ip,
                port: config.unifi.port,
                site: config.unifi.siteID,
                sslverify: false
            });

            /**
             * Login and get vouchers
             */
            controller.login(config.unifi.username, config.unifi.password).then(() => {
                controller.getVouchers().then((vouchers) => {
                    log.info(`[UniFi] Found ${vouchers.length} voucher(s)`);
                    resolve(vouchers);
                }).catch((e) => {
                    log.error('[UniFi] Error while getting vouchers!');
                    log.error(e);
                    reject('[UniFi] Error while getting vouchers!');
                });
            }).catch((e) => {
                log.error('[UniFi] Error while logging in!');
                log.error(e);
                reject('[UniFi] Error while logging in!');
            });
        });
    }
}

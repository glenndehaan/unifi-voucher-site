/**
 * Import vendor modules
 */
const unifi = require('node-unifi');

/**
 * Import own modules
 */
const variables = require('./variables');
const log = require('./log');
const fetch = require('../utils/fetch');

/**
 * UniFi Settings
 */
const settings = {
    ip: variables.unifiIp,
    port: variables.unifiPort,
    username: variables.unifiUsername,
    password: variables.unifiPassword,
    siteID: variables.unifiSiteId
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

        if(settings.username.includes('@')) {
            reject('[UniFi] Incorrect username detected! UniFi Cloud credentials are not supported!');
            return;
        }

        // Create new UniFi controller object
        controller = new unifi.Controller({
            host: settings.ip,
            port: settings.port,
            site: settings.siteID,
            sslverify: false
        });

        // Login to UniFi Controller
        controller.login(settings.username, settings.password).then(() => {
            log.debug('[UniFi] Login successful!');
            resolve();
        }).catch((e) => {
            // Something went wrong so clear the current controller so a user can retry
            controller = null;
            log.error('[UniFi] Error while logging in!');
            log.debug(e);
            reject('[UniFi] Error while logging in!');
        });
    });
}

/**
 * UniFi module functions
 *
 * @type {{create: (function(*, number=, string=): Promise<*>), remove: (function(*): Promise<*>), list: (function(): Promise<*>), guests: (function(boolean=): Promise<*>)}}
 */
const unifiModule = {
    /**
     * Creates a new UniFi Voucher
     *
     * @param type
     * @param amount
     * @param note
     * @return {Promise<unknown>}
     */
    create: (type, amount = 1, note = '') => {
        return new Promise((resolve, reject) => {
            // Set base voucher data
            const data = {
                count: amount,
                name: note,
                timeLimitMinutes: type.expiration
            };

            // Set voucher limit usage if limited
            if(parseInt(type.usage) !== 0) {
                data.authorizedGuestLimit = parseInt(type.usage);
            }

            // Set data usage limit if limited
            if(typeof type.megabytes !== "undefined") {
                data.dataUsageLimitMBytes = type.megabytes;
            }

            // Set download speed limit if limited
            if(typeof type.download !== "undefined") {
                data.rxRateLimitKbps = type.download;
            }

            // Set upload speed limit if limited
            if(typeof type.upload !== "undefined") {
                data.txRateLimitKbps = type.upload;
            }

            fetch(`/hotspot/vouchers`, 'POST', {}, data).then((response) => {
                if(amount > 1) {
                    log.info(`[UniFi] Created ${amount} vouchers`);
                    resolve(true);
                } else {
                    const voucherCode = `${[response.vouchers[0].code.slice(0, 5), '-', response.vouchers[0].code.slice(5)].join('')}`;
                    log.info(`[UniFi] Created voucher with code: ${voucherCode}`);
                    resolve(voucherCode);
                }
            }).catch((e) => {
                log.error('[UniFi] Error while creating voucher!');
                log.debug(e);
                reject('[UniFi] Error while creating voucher!');
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
            fetch(`/hotspot/vouchers/${id}`, 'DELETE').then(() => {
                log.info(`[UniFi] Deleted voucher: ${id}`);
                resolve(true);
            }).catch((e) => {
                log.error('[UniFi] Error while removing voucher!');
                log.debug(e);
                reject('[UniFi] Error while removing voucher!');
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
            fetch('/hotspot/vouchers', 'GET', {
                limit: 10000
            }).then((vouchers) => {
                log.info(`[UniFi] Found ${vouchers.length} voucher(s)`);
                resolve(vouchers.sort((a, b) => {
                    if (a.createdAt > b.createdAt) return -1;
                    if (a.createdAt < b.createdAt) return 1;
                }));
            }).catch((e) => {
                log.error('[UniFi] Error while getting vouchers!');
                log.debug(e);
                reject('[UniFi] Error while getting vouchers!');
            });
        });
    },

    /**
     * Returns a list with all UniFi Guests
     *
     * @param retry
     * @return {Promise<unknown>}
     */
    guests: (retry = true) => {
        return new Promise((resolve, reject) => {
            // fetch('/clients', 'GET', {
            //     filter: 'access.type.eq(\'GUEST\')',
            //     limit: 10000
            // }).then((clients) => {
            //     console.log(clients)
            // }).catch((e) => {
            //     log.error('[UniFi] Error while getting vouchers!');
            //     log.debug(e);
            //     reject('[UniFi] Error while getting vouchers!');
            // });

            startSession().then(() => {
                controller.getGuests().then((guests) => {
                    log.info(`[UniFi] Found ${guests.length} guest(s)`);
                    resolve(guests);
                }).catch((e) => {
                    log.error('[UniFi] Error while getting guests!');
                    log.debug(e);

                    // Check if token expired, if true attempt login then try again
                    if (e.response) {
                        if(e.response.status === 401 && retry) {
                            log.info('[UniFi] Attempting re-authentication & retry...');

                            controller = null;
                            unifiModule.guests(false).then((e) => {
                                resolve(e);
                            }).catch((e) => {
                                reject(e);
                            });
                        } else {
                            // Something else went wrong lets clear the current controller so a user can retry
                            log.error(`[UniFi] Unexpected ${JSON.stringify({status: e.response.status, retry})} cleanup controller...`);
                            controller = null;
                            reject('[UniFi] Error while getting guests!');
                        }
                    } else {
                        // Something else went wrong lets clear the current controller so a user can retry
                        log.error('[UniFi] Unexpected cleanup controller...');
                        controller = null;
                        reject('[UniFi] Error while getting guests!');
                    }
                });
            }).catch((e) => {
                reject(e);
            });
        });
    }
}

/**
 * Exports the UniFi module functions
 */
module.exports = unifiModule;

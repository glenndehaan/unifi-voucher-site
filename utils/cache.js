/**
 * Import own modules
 */
const log = require('../modules/log');
const unifi = require('../modules/unifi');
const cache = require('../modules/cache');

/**
 * Exports all cache utils
 *
 * @type {{updateCache: (function(): Promise<*>)}}
 */
module.exports = {
    /**
     * Update the cache
     *
     * @return {Promise<*>}
     */
    updateCache: () => {
        return new Promise(async (resolve) => {
            log.info('[Cache] Requesting UniFi Vouchers...');

            const vouchers = await unifi.list().catch(() => {
                log.error('[Cache] Error requesting vouchers!');
            });

            if(vouchers) {
                cache.vouchers = vouchers;
                cache.updated = new Date().getTime();
                log.info(`[Cache] Saved ${vouchers.length} voucher(s)`);
            }

            resolve();
        });
    }
};

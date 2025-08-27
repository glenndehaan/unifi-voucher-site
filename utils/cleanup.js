/**
 * Import own modules
 */
const cache = require('../modules/cache');
const log = require('../modules/log');
const unifi = require('../modules/unifi');

/**
 * Import own utils
 */
const {updateCache} = require('./cache');

module.exports = {
    /**
     * Function to clean up expired vouchers
     *
     * @returns {Promise<unknown>}
     */
    cleanupExpired: () => {
        return new Promise(async (resolve) => {
            // Filter vouchers in cache
            const vouchers = cache.vouchers.filter((voucher) => {
                return voucher.expired;
            });

            log.debug(`[Cleanup] Removing ${vouchers.length} voucher(s)...`);

            // Remove vouchers
            for(let item = 0; item < vouchers.length; item++) {
                log.debug(`[Cleanup] Removing voucher: ${vouchers[item].id}`);
                await unifi.remove(vouchers[item].id);
            }

            // Update cache
            await updateCache();

            resolve();
        });
    },

    /**
     * Function to clean up unused voucher that are still active after a day
     *
     * @returns {Promise<unknown>}
     */
    cleanupUnused: () => {
        return new Promise(async (resolve) => {
            const vouchers = cache.vouchers.filter((voucher) => {
                const today = new Date();
                const voucherDate = new Date(voucher.createdAt);
                voucherDate.setDate(voucherDate.getDate() + 1);

                return voucherDate.getTime() < today.getTime();
            });

            log.debug(`[Cleanup] Removing ${vouchers.length} voucher(s)...`);

            for(let item = 0; item < vouchers.length; item++) {
                log.debug(`[Cleanup] Removing voucher: ${vouchers[item].id}...`);
                await unifi.remove(vouchers[item].id);
            }

            // Update cache
            await updateCache();

            resolve();
        });
    }
}

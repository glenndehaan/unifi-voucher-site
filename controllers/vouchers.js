/**
 * Import base packages
 */
const crypto = require('crypto');

/**
 * Import own modules
 */
const variables = require('../modules/variables');
const log = require('../modules/log');
const cache = require('../modules/cache');
const unifi = require('../modules/unifi');

/**
 * Import own utils
 */
const types = require('../utils/types');
const notes = require('../utils/notes');
const time = require('../utils/time');
const bytes = require('../utils/bytes');

module.exports = {
    /**
     * GET - /vouchers
     *
     * @param req
     * @param res
     */
    get: async (req, res) => {
        if(req.query.refresh) {
            log.info('[Cache] Requesting UniFi Vouchers...');

            const vouchers = await unifi.list().catch((e) => {
                log.error('[Cache] Error requesting vouchers!');
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
            });

            if(!vouchers) {
                return;
            }

            log.info('[Cache] Requesting UniFi Guests...');

            const guests = await unifi.guests().catch((e) => {
                log.error('[Cache] Error requesting guests!');
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
            });

            if(vouchers && guests) {
                cache.vouchers = vouchers;
                cache.guests = guests;
                cache.updated = new Date().getTime();
                log.info(`[Cache] Saved ${vouchers.length} voucher(s)`);
                log.info(`[Cache] Saved ${guests.length} guest(s)`);

                res.cookie('flashMessage', JSON.stringify({type: 'info', message: 'Synced Vouchers & Guests!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
            }

            return;
        }

        const user = req.oidc ? req.user : { email: 'admin' };

        res.render('voucher', {
            baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
            gitTag: variables.gitTag,
            gitBuild: variables.gitBuild,
            user: user,
            userIcon: req.oidc ? crypto.createHash('sha256').update(user.email).digest('hex') : '',
            authDisabled: variables.authDisabled,
            info: req.flashMessage.type === 'info',
            info_text: req.flashMessage.message || '',
            error: req.flashMessage.type === 'error',
            error_text: req.flashMessage.message || '',
            kioskEnabled: variables.kioskEnabled,
            quickPrintEnabled: variables.printers !== '',
            timeConvert: time,
            bytesConvert: bytes,
            notesConvert: notes,
            email_enabled: variables.smtpFrom !== '' && variables.smtpHost !== '' && variables.smtpPort !== '',
            printer_enabled: variables.printers !== '',
            voucher_types: types(variables.voucherTypes),
            voucher_custom: variables.voucherCustom,
            vouchers: cache.vouchers.filter((item) => {
                if(variables.authOidcRestrictVisibility && req.oidc) {
                    return item.name && notes(item.name).auth_oidc_domain === user.email.split('@')[1].toLowerCase();
                }

                return true;
            }).filter((item) => {
                if(req.query.status === 'available') {
                    return item.authorizedGuestCount === 0 && !item.expired;
                }

                if(req.query.status === 'in-use') {
                    return item.authorizedGuestCount > 0 && !item.expired;
                }

                if(req.query.status === 'expired') {
                    return item.expired;
                }

                return true;
            }).filter((item) => {
                if(req.query.quota === 'multi-use') {
                    return (item.authorizedGuestLimit && item.authorizedGuestLimit > 1) || !item.authorizedGuestLimit;
                }

                if(req.query.quota === 'single-use') {
                    return item.authorizedGuestLimit && item.authorizedGuestLimit === 1;
                }

                return true;
            }).sort((a, b) => {
                if(req.query.sort === 'code') {
                    if (a.code > b.code) return -1;
                    if (a.code < b.code) return 1;
                }

                if(req.query.sort === 'note') {
                    if ((notes(a.name).note || '') > (notes(b.name).note || '')) return -1;
                    if ((notes(a.name).note || '') < (notes(b.name).note || '')) return 1;
                }

                if(req.query.sort === 'duration') {
                    if (a.timeLimitMinutes > b.timeLimitMinutes) return -1;
                    if (a.timeLimitMinutes < b.timeLimitMinutes) return 1;
                }

                if(req.query.sort === 'status') {
                    if (a.authorizedGuestCount > b.authorizedGuestCount) return -1;
                    if (a.authorizedGuestCount < b.authorizedGuestCount) return 1;
                }
            }),
            updated: cache.updated,
            filters: {
                status: req.query.status,
                quota: req.query.quota
            },
            sort: req.query.sort
        });
    }
};

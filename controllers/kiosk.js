/**
 * Import own modules
 */
const variables = require('../modules/variables');
const log = require('../modules/log');
const cache = require('../modules/cache');
const unifi = require('../modules/unifi');
const print = require('../modules/print');
const mail = require('../modules/mail');
const qr = require('../modules/qr');
const translation = require('../modules/translation');

/**
 * Import own utils
 */
const types = require('../utils/types');
const time = require('../utils/time');
const bytes = require('../utils/bytes');
const languages = require('../utils/languages');

module.exports = {
    /**
     * GET - /kiosk
     *
     * @param req
     * @param res
     */
    get: (req, res) => {
        // Check if kiosk is disabled
        if(!variables.kioskEnabled) {
            res.status(501).send();
            return;
        }

        res.render('kiosk', {
            t: translation('kiosk', req.locale.language),
            languages,
            language: req.locale.language,
            baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
            error: req.flashMessage.type === 'error',
            error_text: req.flashMessage.message || '',
            timeConvert: time,
            bytesConvert: bytes,
            voucher_types: types(variables.kioskVoucherTypes),
            kiosk_name_required: variables.kioskNameRequired,
            kiosk_homepage: variables.kioskHomepage
        });
    },

    /**
     * POST - /kiosk
     *
     * @param req
     * @param res
     */
    post: async (req, res) => {
        // Check if kiosk is disabled
        if(!variables.kioskEnabled) {
            res.status(501).send();
            return;
        }

        // Check if we need to generate a voucher or send an email with an existing voucher
        if(req.body && req.body.id && req.body.code && req.body.email) {
            // Check if email functions are enabled
            if(variables.smtpFrom === '' || variables.smtpHost === '' || variables.smtpPort === '') {
                res.status(501).send();
                return;
            }

            // Get voucher from cache
            const voucher = cache.vouchers.find((e) => {
                return e.id === req.body.id;
            });

            if(voucher) {
                const emailResult = await mail.send(req.body.email, voucher, req.locale.language).catch((e) => {
                    res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/kiosk`);
                });

                if(emailResult) {
                    res.render('kiosk', {
                        t: translation('kiosk', req.locale.language),
                        languages,
                        language: req.locale.language,
                        baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
                        error: req.flashMessage.type === 'error',
                        error_text: req.flashMessage.message || '',
                        timeout: parseInt(variables.kioskTimeout),
                        email_enabled: variables.kioskEmail && variables.smtpFrom !== '' && variables.smtpHost !== '' && variables.smtpPort !== '',
                        unifiSsid: variables.unifiSsid,
                        unifiSsidPassword: variables.unifiSsidPassword,
                        qr: await qr(),
                        voucherId: req.body.id,
                        voucherCode: req.body.code,
                        email: req.body.email
                    });
                }
            } else {
                res.status(404);
                res.render('404', {
                    baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''
                });
            }
        } else {
            const typeCheck = (variables.kioskVoucherTypes).split(';').includes(req.body['voucher-type']);

            if (!typeCheck) {
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Unknown Type!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/kiosk`);
                return;
            }

            if(variables.kioskNameRequired && req.body['voucher-note'] !== '' && req.body['voucher-note'].includes('||;;||')) {
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Invalid Notes!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/kiosk`);
                return;
            }

            const voucherNote = `${variables.kioskNameRequired ? req.body['voucher-note'] : ''}||;;||kiosk||;;||local||;;||`;

            // Create voucher code
            const voucherCode = await unifi.create(types(req.body['voucher-type'], true), 1, voucherNote).catch((e) => {
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/kiosk`);
            });

            if (voucherCode) {
                log.info('[Cache] Requesting UniFi Vouchers...');

                const vouchers = await unifi.list().catch((e) => {
                    log.error('[Cache] Error requesting vouchers!');
                    res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/kiosk`);
                });

                if (vouchers) {
                    cache.vouchers = vouchers;
                    cache.updated = new Date().getTime();
                    log.info(`[Cache] Saved ${vouchers.length} voucher(s)`);

                    // Locate voucher data within cache
                    const voucherData = cache.vouchers.find(voucher => voucher.code === voucherCode.replaceAll('-', ''));
                    if(!voucherData) {
                        res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Invalid application cache!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/kiosk`);
                        return;
                    }

                    // Auto print voucher if enabled
                    if(variables.kioskPrinter !== '') {
                        await print.escpos(voucherData, req.locale.language, variables.kioskPrinter).catch((e) => {
                            log.error(`[Kiosk] Unable to auto-print voucher on printer: ${variables.kioskPrinter}!`);
                            log.error(e);
                        });
                    }

                    res.render('kiosk', {
                        t: translation('kiosk', req.locale.language),
                        languages,
                        language: req.locale.language,
                        baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
                        error: req.flashMessage.type === 'error',
                        error_text: req.flashMessage.message || '',
                        timeout: parseInt(variables.kioskTimeout),
                        email_enabled: variables.kioskEmail && variables.smtpFrom !== '' && variables.smtpHost !== '' && variables.smtpPort !== '',
                        unifiSsid: variables.unifiSsid,
                        unifiSsidPassword: variables.unifiSsidPassword,
                        qr: await qr(),
                        voucherId: voucherData.id,
                        voucherCode
                    });
                }
            }
        }
    }
};

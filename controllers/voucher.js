/**
 * Import own modules
 */
const variables = require('../modules/variables');
const log = require('../modules/log');
const cache = require('../modules/cache');
const unifi = require('../modules/unifi');
const print = require('../modules/print');
const mail = require('../modules/mail');

/**
 * Import own utils
 */
const types = require('../utils/types');
const notes = require('../utils/notes');
const time = require('../utils/time');
const bytes = require('../utils/bytes');
const languages = require('../utils/languages');

module.exports = {
    voucher: {
        /**
         * GET - /voucher/:id
         *
         * @param req
         * @param res
         */
        get: (req, res) => {
            const voucher = cache.vouchers.find((e) => {
                return e.id === req.params.id;
            });
            const guests = cache.guests.filter((e) => {
                return e.voucher_code === voucher.code;
            });

            if(voucher) {
                res.render('components/details', {
                    baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
                    timeConvert: time,
                    bytesConvert: bytes,
                    notesConvert: notes,
                    voucher,
                    guests,
                    updated: cache.updated
                });
            } else {
                res.status(404);
                res.render('404', {
                    baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''
                });
            }
        },

        /**
         * POST - /voucher
         *
         * @param req
         * @param res
         */
        post: async (req, res) => {
            if (typeof req.body === "undefined") {
                res.status(400).send();
                return;
            }

            if(req.body['voucher-type'] !== 'custom') {
                const typeCheck = (variables.voucherTypes).split(';').includes(req.body['voucher-type']);

                if (!typeCheck) {
                    res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Unknown Type!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                    return;
                }
            }

            if(req.body['voucher-note'] !== '' && req.body['voucher-note'].includes('||;;||')) {
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Invalid Notes!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                return;
            }

            const user = req.oidc ? req.user : { email: null };
            const voucherNote = `${req.body['voucher-note'] !== '' ? req.body['voucher-note'] : ''}||;;||web||;;||${req.oidc ? 'oidc' : 'local'}||;;||${req.oidc ? user.email.split('@')[1].toLowerCase() : ''}`;

            // Create voucher code
            const voucherCode = await unifi.create(types(req.body['voucher-type'] === 'custom' ? `${req.body['voucher-duration-type'] === 'day' ? (parseInt(req.body['voucher-duration']) * 24 * 60) : req.body['voucher-duration-type'] === 'hour' ? (parseInt(req.body['voucher-duration']) * 60) : parseInt(req.body['voucher-duration'])},${req.body['voucher-usage'] === '-1' ? req.body['voucher-quota'] : req.body['voucher-usage']},${req.body['voucher-upload-limit']},${req.body['voucher-download-limit']},${req.body['voucher-data-limit']};` : req.body['voucher-type'], true), parseInt(req.body['voucher-amount']), voucherNote).catch((e) => {
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
            });

            if(voucherCode) {
                log.info('[Cache] Requesting UniFi Vouchers...');

                const vouchers = await unifi.list().catch((e) => {
                    log.error('[Cache] Error requesting vouchers!');
                    res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                });

                if(vouchers) {
                    cache.vouchers = vouchers;
                    cache.updated = new Date().getTime();
                    log.info(`[Cache] Saved ${vouchers.length} voucher(s)`);

                    res.cookie('flashMessage', JSON.stringify({type: 'info', message: parseInt(req.body['voucher-amount']) > 1 ? `${req.body['voucher-amount']} Vouchers Created!` : `Voucher Created: ${voucherCode}`}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                }
            }
        }
    },

    remove: {
        /**
         * GET - /voucher/:id/remove
         *
         * @param req
         * @param res
         */
        get: async (req, res) => {
            // Revoke voucher code
            const response = await unifi.remove(req.params.id).catch((e) => {
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
            });

            if(response) {
                log.info('[Cache] Requesting UniFi Vouchers...');

                const vouchers = await unifi.list().catch((e) => {
                    log.error('[Cache] Error requesting vouchers!');
                    res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                });

                if(vouchers) {
                    cache.vouchers = vouchers;
                    cache.updated = new Date().getTime();
                    log.info(`[Cache] Saved ${vouchers.length} voucher(s)`);

                    res.cookie('flashMessage', JSON.stringify({type: 'info', message: `Voucher Removed!`}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                }
            }
        }
    },

    print: {
        /**
         * GET - /voucher/:id/print
         *
         * @param req
         * @param res
         */
        get: (req, res) => {
            if(variables.printers === '') {
                res.status(501).send();
                return;
            }

            const voucher = cache.vouchers.find((e) => {
                return e.id === req.params.id;
            });

            if(voucher) {
                res.render('components/print', {
                    baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
                    languages,
                    defaultLanguage: variables.translationDefault,
                    printers: variables.printers.split(','),
                    voucher,
                    updated: cache.updated
                });
            } else {
                res.status(404);
                res.render('404', {
                    baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''
                });
            }
        },

        /**
         * POST - /voucher/:id/print
         *
         * @param req
         * @param res
         */
        post: async (req, res) => {
            if(variables.printers === '') {
                res.status(501).send();
                return;
            }

            if(!variables.printers.includes(req.body.printer)) {
                res.status(400).send();
                return;
            }

            const voucher = cache.vouchers.find((e) => {
                return e.id === req.params.id;
            });

            if(voucher) {
                if(req.body.printer === 'pdf') {
                    const buffers = await print.pdf(voucher, req.body.language);
                    const pdfData = Buffer.concat(buffers);
                    res.writeHead(200, {
                        'Content-Length': Buffer.byteLength(pdfData),
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment;filename=voucher_${req.params.id}.pdf`
                    }).end(pdfData);
                } else {
                    const printResult = await print.escpos(voucher, req.body.language, req.body.printer).catch((e) => {
                        res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                    });

                    if(printResult) {
                        res.cookie('flashMessage', JSON.stringify({type: 'info', message: `Voucher send to printer!`}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                    }
                }
            } else {
                res.status(404);
                res.render('404', {
                    baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''
                });
            }
        }
    },

    email: {
        /**
         * GET - /voucher/:id/email
         *
         * @param req
         * @param res
         */
        get: (req, res) => {
            if(variables.smtpFrom === '' || variables.smtpHost === '' || variables.smtpPort === '') {
                res.status(501).send();
                return;
            }

            const voucher = cache.vouchers.find((e) => {
                return e.id === req.params.id;
            });

            if(voucher) {
                res.render('components/email', {
                    baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
                    languages,
                    defaultLanguage: variables.translationDefault,
                    voucher,
                    updated: cache.updated
                });
            } else {
                res.status(404);
                res.render('404', {
                    baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''
                });
            }
        },

        /**
         * POST - /voucher/:id/email
         *
         * @param req
         * @param res
         */
        post: async (req, res) => {
            if(variables.smtpFrom === '' || variables.smtpHost === '' || variables.smtpPort === '') {
                res.status(501).send();
                return;
            }

            if (typeof req.body === "undefined") {
                res.status(400).send();
                return;
            }

            const voucher = cache.vouchers.find((e) => {
                return e.id === req.params.id;
            });

            if(voucher) {
                const emailResult = await mail.send(req.body.email, voucher, req.body.language).catch((e) => {
                    res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                });

                if(emailResult) {
                    res.cookie('flashMessage', JSON.stringify({type: 'info', message: 'Email has been sent!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                }
            } else {
                res.status(404);
                res.render('404', {
                    baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''
                });
            }
        }
    }
};

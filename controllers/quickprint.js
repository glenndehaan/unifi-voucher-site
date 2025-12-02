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
const print = require('../modules/print');

/**
 * Import own utils
 */
const types = require('../utils/types');
const time = require('../utils/time');
const bytes = require('../utils/bytes');
const languages = require('../utils/languages');

const printerList = () => variables.printers.split(',').filter((printer) => printer !== '');

const renderPage = (req, res, extra = {}) => {
    res.render('quickprint', {
        baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
        gitTag: variables.gitTag,
        gitBuild: variables.gitBuild,
        kioskEnabled: variables.kioskEnabled,
        authDisabled: variables.authDisabled,
        user: req.oidc ? req.user : { email: 'admin' },
        userIcon: req.oidc ? crypto.createHash('sha256').update(req.user.email).digest('hex') : '',
        printers: printerList(),
        voucher_types: types(variables.voucherTypes),
        languages,
        defaultLanguage: variables.translationDefault,
        timeConvert: time,
        bytesConvert: bytes,
        ...extra
    });
};

module.exports = {
    /**
     * GET - /quick-print
     *
     * @param req
     * @param res
     */
    get: (req, res) => {
        if(variables.printers === '') {
            res.status(501).send();
            return;
        }

        renderPage(req, res, {
            info: req.flashMessage.type === 'info',
            info_text: req.flashMessage.message || '',
            error: req.flashMessage.type === 'error',
            error_text: req.flashMessage.message || ''
        });
    },

    /**
     * POST - /quick-print
     *
     * @param req
     * @param res
     */
    post: async (req, res) => {
        if(variables.printers === '') {
            res.status(501).send();
            return;
        }

        if (typeof req.body === 'undefined') {
            res.status(400).send();
            return;
        }

        const availablePrinters = printerList();

        if(!availablePrinters.includes(req.body.printer)) {
            res.status(400).send();
            return;
        }

        if(!variables.voucherTypes.split(';').includes(req.body['voucher-type'])) {
            res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Unknown Type!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/quick-print`);
            return;
        }

        const user = req.oidc ? req.user : { email: null };
        const voucherNote = `||;;||quickprint||;;||${req.oidc ? 'oidc' : 'local'}||;;||${req.oidc ? user.email.split('@')[1].toLowerCase() : ''}`;
        const language = req.body.language && Object.keys(languages).includes(req.body.language) ? req.body.language : variables.translationDefault;

        const voucherCode = await unifi.create(types(req.body['voucher-type'], true), 1, voucherNote).catch((e) => {
            res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/quick-print`);
        });

        if(!voucherCode) {
            return;
        }

        log.info('[Cache] Requesting UniFi Vouchers...');

        const vouchers = await unifi.list().catch((e) => {
            log.error('[Cache] Error requesting vouchers!');
            res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/quick-print`);
        });

        if(!vouchers) {
            return;
        }

        cache.vouchers = vouchers;
        cache.updated = new Date().getTime();
        log.info(`[Cache] Saved ${vouchers.length} voucher(s)`);

        const voucherData = cache.vouchers.find(voucher => voucher.code === voucherCode.replaceAll('-', ''));

        if(!voucherData) {
            res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Invalid application cache!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/quick-print`);
            return;
        }

        if(req.body.printer === 'pdf') {
            const buffers = await print.pdf(voucherData, language);
            const pdfData = Buffer.concat(buffers);
            res.writeHead(200, {
                'Content-Length': Buffer.byteLength(pdfData),
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment;filename=voucher_${voucherData.id}.pdf`
            }).end(pdfData);
            return;
        }

        const printResult = await print.escpos(voucherData, language, req.body.printer).catch((e) => {
            log.error(`[Quick Print] Unable to auto-print voucher on printer: ${req.body.printer}!`);
            log.error(e);
            res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/quick-print`);
        });

        if(printResult) {
            renderPage(req, res, {
                info: true,
                info_text: `Voucher ${voucherCode} sent to printer ${req.body.printer}!`,
                lastVoucher: voucherData
            });
        }
    }
};

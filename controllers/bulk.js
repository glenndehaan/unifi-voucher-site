/**
 * Import own modules
 */
const variables = require('../modules/variables');
const cache = require('../modules/cache');
const print = require('../modules/print');

/**
 * Import own utils
 */
const notes = require('../utils/notes');
const time = require('../utils/time');
const bytes = require('../utils/bytes');
const languages = require('../utils/languages');

module.exports = {
    print: {
        /**
         * GET - /bulk/print
         *
         * @param req
         * @param res
         */
        get: (req, res) => {
            if(variables.printers === '') {
                res.status(501).send();
                return;
            }

            res.render('components/bulk-print', {
                baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
                timeConvert: time,
                bytesConvert: bytes,
                notesConvert: notes,
                languages,
                defaultLanguage: variables.translationDefault,
                printers: variables.printers.split(','),
                vouchers: cache.vouchers,
                updated: cache.updated
            });
        },

        /**
         * POST - /bulk/print
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

            if(!req.body.vouchers) {
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'No selected vouchers to print!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                return;
            }

            // Single checkboxes get send as string so conversion is needed
            if(typeof req.body.vouchers === 'string') {
                req.body.vouchers = [req.body.vouchers];
            }

            const vouchers = req.body.vouchers.map((voucher) => {
                return cache.vouchers.find((e) => {
                    return e.id === voucher;
                });
            });

            if(!vouchers.includes(undefined)) {
                if(req.body.printer === 'pdf') {
                    const buffers = await print.pdf(vouchers, req.body.language, true);
                    const pdfData = Buffer.concat(buffers);
                    res.writeHead(200, {
                        'Content-Length': Buffer.byteLength(pdfData),
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment;filename=bulk_vouchers_${new Date().getTime()}.pdf`
                    }).end(pdfData);
                } else {
                    let printSuccess = true;

                    for(let voucher = 0; voucher < vouchers.length; voucher++) {
                        const printResult = await print.escpos(vouchers[voucher], req.body.language, req.body.printer).catch((e) => {
                            res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                        });

                        if(!printResult) {
                            printSuccess = false;
                            break;
                        }
                    }

                    if(printSuccess) {
                        res.cookie('flashMessage', JSON.stringify({type: 'info', message: `Vouchers send to printer!`}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                    }
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

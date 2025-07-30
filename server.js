/**
 * Import base packages
 */
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const locale = require('express-locale');

/**
 * Import own modules
 */
const variables = require('./modules/variables');
const log = require('./modules/log');
const cache = require('./modules/cache');
const jwt = require('./modules/jwt');
const info = require('./modules/info');
const unifi = require('./modules/unifi');
const print = require('./modules/print');
const mail = require('./modules/mail');
const oidc = require('./modules/oidc');
const qr = require('./modules/qr');
const translation = require('./modules/translation');

/**
 * Import own middlewares
 */
const authorization = require('./middlewares/authorization');
const flashMessage = require('./middlewares/flashMessage');

/**
 * Import own utils
 */
const {updateCache} = require('./utils/cache');
const types = require('./utils/types');
const time = require('./utils/time');
const bytes = require('./utils/bytes');
const status = require('./utils/status');
const languages = require('./utils/languages');

/**
 * Setup Express app
 */
const app = express();

/**
 * Output info
 */
info();

/**
 * Initialize JWT
 */
if(!variables.authDisabled && variables.authInternalEnabled) {
    jwt.init();
}

/**
 * Trust proxy
 */
app.enable('trust proxy');

/**
 * Set template engine
 */
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/template`);

/**
 * GET /_health - Health check page
 */
app.get('/_health', (req, res) => {
    res.json({
        status: 'UP',
        host: os.hostname(),
        load: process.cpuUsage(),
        mem: process.memoryUsage(),
        uptime: process.uptime()
    });
});

/**
 * Request logger
 */
app.use((req, res, next) => {
    log.info(`[Web]: ${req.originalUrl}`);
    next();
});

/**
 * Override kiosk images dir if available
 */
if(fs.existsSync('/kiosk')) {
    app.use('/images/kiosk', express.static('/kiosk'));
}

/**
 * Serve static public dir
 */
app.use(express.static(`${__dirname}/public`));

/**
 * Initialize OIDC
 */
if(!variables.authDisabled && variables.authOidcEnabled) {
    oidc.init(app);
}

/**
 * Enable JSON
 */
app.use(express.json());

/**
 * Enable multer
 */
app.use(multer().none());

/**
 * Enable cookie-parser
 */
app.use(cookieParser());

/**
 * Enable locale
 */
app.use(locale({
    'priority': ['query', 'accept-language', 'default'],
    'default': 'en-GB'
}));

/**
 * Enable flash-message
 */
app.use(flashMessage);

/**
 * Configure routers
 */
app.get('/', (req, res) => {
    if(variables.serviceWeb) {
        res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
    } else {
        res.status(501).send();
    }
});

// Check if web service is enabled
if(variables.serviceWeb) {
    app.get('/kiosk', (req, res) => {
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
            kiosk_name_required: variables.kioskNameRequired
        });
    });
    app.post('/kiosk', async (req, res) => {
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
                return e._id === req.body.id;
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
                        email_enabled: variables.smtpFrom !== '' && variables.smtpHost !== '' && variables.smtpPort !== '',
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

            // Create voucher code
            const voucherCode = await unifi.create(types(req.body['voucher-type'], true), 1, variables.kioskNameRequired ? req.body['voucher-note'] : null).catch((e) => {
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
                    await print.escpos(voucherData, req.locale.language, variables.kioskPrinter).catch((e) => {
                        log.error(`[Kiosk] Unable to auto-print voucher on printer: ${variables.kioskPrinter}!`);
                        log.error(e);
                    });

                    res.render('kiosk', {
                        t: translation('kiosk', req.locale.language),
                        languages,
                        language: req.locale.language,
                        baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
                        error: req.flashMessage.type === 'error',
                        error_text: req.flashMessage.message || '',
                        email_enabled: variables.smtpFrom !== '' && variables.smtpHost !== '' && variables.smtpPort !== '',
                        unifiSsid: variables.unifiSsid,
                        unifiSsidPassword: variables.unifiSsidPassword,
                        qr: await qr(),
                        voucherId: voucherData._id,
                        voucherCode
                    });
                }
            }
        }
    });
    app.get('/login', (req, res) => {
        // Check if authentication is disabled
        if (variables.authDisabled) {
            res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
            return;
        }

        const hour = new Date().getHours();
        const timeHeader = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

        res.render('login', {
            baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
            error: req.flashMessage.type === 'error',
            error_text: req.flashMessage.message || '',
            app_header: timeHeader,
            internalAuth: variables.authInternalEnabled,
            oidcAuth: variables.authOidcEnabled
        });
    });
    app.post('/login', async (req, res) => {
        // Check if internal authentication is enabled
        if(!variables.authInternalEnabled) {
            res.status(501).send();
            return;
        }

        if (typeof req.body === "undefined") {
            res.status(400).send();
            return;
        }

        const passwordCheck = req.body.password === variables.authInternalPassword;

        if (!passwordCheck) {
            res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Password Invalid!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/login`);
            return;
        }

        res.cookie('authorization', jwt.sign(), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
    });
    app.get('/logout', [authorization.web], (req, res) => {
        // Check if authentication is disabled
        if (variables.authDisabled) {
            res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
            return;
        }

        if(req.oidc) {
            res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/oidc/logout`);
        } else {
            res.cookie('authorization', '', {httpOnly: true, expires: new Date(0)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/`);
        }
    });
    app.post('/voucher', [authorization.web], async (req, res) => {
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

        // --- Description und Domain kombinieren, wenn aktiviert ---
        let voucherNote = null;
        if (variables.pinOidcUserToOwnDomain && req.oidc) {
            try {
                const user = await req.oidc.fetchUserInfo();
                if (user && user.email && user.email.includes('@')) {
                    const domain = user.email.split('@')[1];
                    if (req.body['voucher-note'] && req.body['voucher-note'] !== '') {
                        voucherNote = `${req.body['voucher-note']}|||${domain}`;
                    } else {
                        voucherNote = domain;
                    }
                }
            } catch (e) {
                // Fehler ignorieren, falls Userinfo nicht geladen werden kann
            }
        } else {
            voucherNote = req.body['voucher-note'] !== '' ? req.body['voucher-note'] : null;
        }
        // --- ENDE ---

        // Create voucher code
        const voucherCode = await unifi.create(
            types(
                req.body['voucher-type'] === 'custom'
                    ? `${req.body['voucher-duration-type'] === 'day' ? (parseInt(req.body['voucher-duration']) * 24 * 60) : req.body['voucher-duration-type'] === 'hour' ? (parseInt(req.body['voucher-duration']) * 60) : parseInt(req.body['voucher-duration'])},${req.body['voucher-usage'] === '-1' ? req.body['voucher-quota'] : req.body['voucher-usage']},${req.body['voucher-upload-limit']},${req.body['voucher-download-limit']},${req.body['voucher-data-limit']};`
                    : req.body['voucher-type'],
                true
            ),
            parseInt(req.body['voucher-amount']),
            voucherNote
        ).catch((e) => {
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
    });
    app.get('/voucher/:id/remove', [authorization.web], async (req, res) => {
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
    });
    app.get('/voucher/:id/print', [authorization.web], async (req, res) => {
        if(variables.printers === '') {
            res.status(501).send();
            return;
        }

        const voucher = cache.vouchers.find((e) => {
            return e._id === req.params.id;
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
    });
    app.post('/voucher/:id/print', [authorization.web], async (req, res) => {
        if(variables.printers === '') {
            res.status(501).send();
            return;
        }

        if(!variables.printers.includes(req.body.printer)) {
            res.status(400).send();
            return;
        }

        const voucher = cache.vouchers.find((e) => {
            return e._id === req.params.id;
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
    });
    app.get('/voucher/:id/email', [authorization.web], async (req, res) => {
        if(variables.smtpFrom === '' || variables.smtpHost === '' || variables.smtpPort === '') {
            res.status(501).send();
            return;
        }

        const voucher = cache.vouchers.find((e) => {
            return e._id === req.params.id;
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
    });
    app.post('/voucher/:id/email', [authorization.web], async (req, res) => {
        if(variables.smtpFrom === '' || variables.smtpHost === '' || variables.smtpPort === '') {
            res.status(501).send();
            return;
        }

        if (typeof req.body === "undefined") {
            res.status(400).send();
            return;
        }

        const voucher = cache.vouchers.find((e) => {
            return e._id === req.params.id;
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
    });
    app.get('/vouchers', [authorization.web], async (req, res) => {
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

        const user = req.oidc ? await req.oidc.fetchUserInfo() : { email: 'admin' };

        // --- NEU: Filter nach Domain, wenn aktiviert ---
        let filteredVouchers = cache.vouchers;
        if (
            variables.pinOidcUserToOwnDomain &&
            req.oidc &&
            user.email &&
            user.email.includes('@')
        ) {
            const userDomain = user.email.split('@')[1].toLowerCase();
            filteredVouchers = filteredVouchers.filter(v => {
                const note = (v.note || '').toLowerCase();
                if (note.includes('|||')) {
                    return note.split('|||')[1] === userDomain;
                } else {
                    return note === userDomain;
                }
            });
        }
        // --- ENDE NEU ---

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
            timeConvert: time,
            bytesConvert: bytes,
            email_enabled: variables.smtpFrom !== '' && variables.smtpHost !== '' && variables.smtpPort !== '',
            printer_enabled: variables.printers !== '',
            voucher_types: types(variables.voucherTypes),
            voucher_custom: variables.voucherCustom,
            vouchers: filteredVouchers.filter((item) => {
                if(req.query.status === 'available') {
                    return item.used === 0 && item.status !== 'EXPIRED';
                }

                if(req.query.status === 'in-use') {
                    return item.used > 0 && item.status !== 'EXPIRED';
                }

                if(req.query.status === 'expired') {
                    return item.status === 'EXPIRED';
                }

                return true;
            }).filter((item) => {
                if(req.query.quota === 'multi-use') {
                    return item.quota === 0;
                }

                if(req.query.quota === 'single-use') {
                    return item.quota !== 0;
                }

                return true;
            }).sort((a, b) => {
                if(req.query.sort === 'code') {
                    if (a.code > b.code) return -1;
                    if (a.code < b.code) return 1;
                }

                if(req.query.sort === 'note') {
                    if ((a.note || '') > (b.note || '')) return -1;
                    if ((a.note || '') < (b.note || '')) return 1;
                }

                if(req.query.sort === 'duration') {
                    if (a.duration > b.duration) return -1;
                    if (a.duration < b.duration) return 1;
                }

                if(req.query.sort === 'status') {
                    if (a.used > b.used) return -1;
                    if (a.used < b.used) return 1;
                }
            }),
            updated: cache.updated,
            filters: {
                status: req.query.status,
                quota: req.query.quota
            },
            sort: req.query.sort,
            pinOidcUserToOwnDomain: variables.pinOidcUserToOwnDomain
        });
    });
    app.get('/voucher/:id', [authorization.web], async (req, res) => {
        const voucher = cache.vouchers.find((e) => {
            return e._id === req.params.id;
        });
        const guests = cache.guests.filter((e) => {
            return e.voucher_id === req.params.id;
        });

        if(voucher) {
            res.render('components/details', {
                baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
                timeConvert: time,
                bytesConvert: bytes,
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
    });
    app.get('/status', [authorization.web], async (req, res) => {
        const user = req.oidc ? await req.oidc.fetchUserInfo() : { email: 'admin' };

        res.render('status', {
            baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
            gitTag: variables.gitTag,
            gitBuild: variables.gitBuild,
            kioskEnabled: variables.kioskEnabled,
            user: user,
            userIcon: req.oidc ? crypto.createHash('sha256').update(user.email).digest('hex') : '',
            authDisabled: variables.authDisabled,
            status: status()
        });
    });
    app.get('/bulk/print', [authorization.web], async (req, res) => {
        if(variables.printers === '') {
            res.status(501).send();
            return;
        }

        res.render('components/bulk-print', {
            baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
            timeConvert: time,
            bytesConvert: bytes,
            languages,
            defaultLanguage: variables.translationDefault,
            printers: variables.printers.split(','),
            vouchers: cache.vouchers,
            updated: cache.updated
        });
    });
    app.post('/bulk/print', [authorization.web], async (req, res) => {
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
                return e._id === voucher;
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
    });
}

if(variables.serviceApi) {
    app.get('/api', (req, res) => {
        res.json({
            error: null,
            data: {
                message: 'OK',
                endpoints: [
                    {
                        method: 'GET',
                        endpoint: '/api'
                    },
                    {
                        method: 'GET',
                        endpoint: '/api/types'
                    },
                    {
                        method: 'GET',
                        endpoint: '/api/languages'
                    },
                    {
                        method: 'GET',
                        endpoint: '/api/vouchers'
                    },
                    {
                        method: 'POST',
                        endpoint: '/api/voucher'
                    }
                ]
            }
        });
    });
    app.get('/api/types', (req, res) => {
        res.json({
            error: null,
            data: {
                message: 'OK',
                types: types(variables.voucherTypes)
            }
        });
    });
    app.get('/api/languages', (req, res) => {
        res.json({
            error: null,
            data: {
                message: 'OK',
                languages: Object.keys(languages).map(language => {
                    return {
                        code: language,
                        name: languages[language]
                    }
                })
            }
        });
    });
    app.get('/api/vouchers', [authorization.api], async (req, res) => {
        res.json({
            error: null,
            data: {
                message: 'OK',
                vouchers: cache.vouchers.map((voucher) => {
                    return {
                        id: voucher._id,
                        code: `${voucher.code.slice(0, 5)}-${voucher.code.slice(5)}`,
                        type: voucher.quota === 1 ? 'single' : voucher.quota === 0 ? 'multi' : 'multi',
                        duration: voucher.duration,
                        data_limit: voucher.qos_usage_quota ? voucher.qos_usage_quota : null,
                        download_limit: voucher.qos_rate_max_down ? voucher.qos_rate_max_down : null,
                        upload_limit: voucher.qos_rate_max_up ? voucher.qos_rate_max_up : null
                    };
                }),
                updated: cache.updated
            }
        });
    });
    app.post('/api/voucher', [authorization.api], async (req, res) => {
        // Verify valid body is sent
        if(!req.body || !req.body.type) {
            res.status(400).json({
                error: 'Invalid Body!',
                data: {}
            });
            return;
        }

        // Check if email body is set
        if(req.body.email) {
            // Check if email module is enabled
            if(variables.smtpFrom === '' || variables.smtpHost === '' || variables.smtpPort === '') {
                res.status(400).json({
                    error: 'Email Not Configured!',
                    data: {}
                });
                return;
            }

            // Check if email body is correct
            if(!req.body.email.language || !req.body.email.address) {
                res.status(400).json({
                    error: 'Invalid Body!',
                    data: {}
                });
                return;
            }

            // Check if language is available
            if(!Object.keys(languages).includes(req.body.email.language)) {
                res.status(400).json({
                    error: 'Unknown Language!',
                    data: {}
                });
                return;
            }
        }

        // Check if type is implemented and valid
        const typeCheck = (variables.voucherTypes).split(';').includes(req.body.type);
        if(!typeCheck) {
            res.status(400).json({
                error: 'Unknown Type!',
                data: {}
            });
            return;
        }

        // Create voucher code
        const voucherCode = await unifi.create(types(req.body.type, true)).catch((e) => {
            res.status(500).json({
                error: e,
                data: {}
            });
        });

        // Update application cache
        await updateCache();

        if(voucherCode) {
            // Locate voucher data within cache
            const voucherData = cache.vouchers.find(voucher => voucher.code === voucherCode.replaceAll('-', ''));
            if(!voucherData) {
                res.status(500).json({
                    error: 'Invalid application cache!',
                    data: {}
                });
                return;
            }

            // Check if we should send and email
            if(req.body.email) {
                // Send mail
                const emailResult = await mail.send(req.body.email.address, voucherData, req.body.email.language).catch((e) => {
                    res.status(500).json({
                        error: e,
                        data: {}
                    });
                });

                // Verify is the email was sent successfully
                if(emailResult) {
                    res.json({
                        error: null,
                        data: {
                            message: 'OK',
                            voucher: {
                                id: voucherData._id,
                                code: voucherCode
                            },
                            email: {
                                status: 'SENT',
                                address: req.body.email.address
                            }
                        }
                    });
                }
            } else {
                res.json({
                    error: null,
                    data: {
                        message: 'OK',
                        voucher: {
                            id: voucherData._id,
                            code: voucherCode
                        }
                    }
                });
            }
        }
    });
}

/**
 * Setup default 404 message
 */
app.use((req, res) => {
    res.status(404);
    res.render('404', {
        baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''
    });
});

/**
 * Setup default 500 message
 */
app.use((err, req, res, next) => {
    log.error(err.stack);
    res.status(500);
    res.render('500', {
        baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
        error: err.stack
    });
});

/**
 * Disable powered by header for security reasons
 */
app.disable('x-powered-by');

/**
 * Start listening on port
 */
app.listen(3000, '0.0.0.0', async () => {
    log.info(`[App] Running on: 0.0.0.0:3000`);
    await updateCache();

    // Run auto sync every 15 minutes
    setInterval(async () => {
        log.info('[Auto Sync] Starting Sync...');
        await updateCache();
    }, 900000);
});

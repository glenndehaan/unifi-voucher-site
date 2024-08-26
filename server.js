/**
 * Import base packages
 */
const fs = require('fs');
const os = require('os');
const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const PDFDocument =  require('pdfkit');

/**
 * Import own modules
 */
const config = require('./modules/config');
const log = require('./modules/log');
const cache = require('./modules/cache');
const jwt = require('./modules/jwt');
const logo = require('./utils/logo');
const types = require('./utils/types');
const time = require('./utils/time');
const bytes = require('./utils/bytes');
const unifi = require('./modules/unifi');
const mail = require('./modules/mail');
const oidc = require('./modules/oidc');

/**
 * Import own middlewares
 */
const authorization = require('./middlewares/authorization');
const flashMessage = require('./middlewares/flashMessage');

/**
 * Import own utils
 */
const {updateCache} = require('./utils/cache');

/**
 * Setup Express app
 */
const app = express();

/**
 * Define global variables
 */
const voucherTypes = types(config('voucher_types') || process.env.VOUCHER_TYPES || '480,1,,,;');
const voucherCustom = config('voucher_custom') !== null ? config('voucher_custom') : process.env.VOUCHER_CUSTOM ? process.env.VOUCHER_CUSTOM !== 'false' : true;
const webService = process.env.SERVICE_WEB ? process.env.SERVICE_WEB !== 'false' : true;
const apiService = config('service_api') || (process.env.SERVICE_API === 'true') || false;
const authDisabled = (process.env.AUTH_DISABLE === 'true') || false;
const printerType = config('printer_type') || process.env.PRINTER_TYPE || '';
const smtpFrom = config('smtp_from') || process.env.SMTP_FROM || '';
const smtpHost = config('smtp_host') || process.env.SMTP_HOST || '';
const smtpPort = config('smtp_port') || process.env.SMTP_PORT || 25;
const oidcIssuerBaseUrl = process.env.AUTH_OIDC_ISSUER_BASE_URL || '';
const oidcAppBaseUrl = process.env.AUTH_OIDC_APP_BASE_URL || '';
const oidcClientId = process.env.AUTH_OIDC_CLIENT_ID || '';

/**
 * Output logo
 */
logo();

/**
 * Output build version
 */
if(fs.existsSync('/etc/unifi_voucher_site_build')) {
    log.info(`[Version] ${fs.readFileSync('/etc/unifi_voucher_site_build', 'utf-8')}`);
} else {
    log.info(`[Version] **DEVELOPMENT**`);
}

/**
 * Log external config
 */
if (fs.existsSync('/data/options.json')) {
    log.info('[Options] Found at /data/options.json');
}
if (fs.existsSync(`${__dirname}/.options.json`)) {
    log.info(`[Options] Found at ${__dirname}/.options.json`);
}

/**
 * Log service status
 */
log.info(`[Service][Web] ${webService ? 'Enabled!' : 'Disabled!'}`);
log.info(`[Service][Api] ${apiService ? 'Enabled!' : 'Disabled!'}`);

/**
 * Log voucher types
 */
log.info('[Voucher] Loaded the following types:');
voucherTypes.forEach((type, key) => {
    log.info(`[Voucher][Type][${key}] ${time(type.expiration)}, ${type.usage === '1' ? 'single-use' : 'multi-use'}${typeof type.upload === "undefined" && typeof type.download === "undefined" && typeof type.megabytes === "undefined" ? ', no limits' : `${typeof type.upload !== "undefined" ? `, upload bandwidth limit: ${type.upload} kb/s` : ''}${typeof type.download !== "undefined" ? `, download bandwidth limit: ${type.download} kb/s` : ''}${typeof type.megabytes !== "undefined" ? `, quota limit: ${type.megabytes} mb` : ''}`}`);
});
log.info(`[Voucher][Custom] ${voucherCustom ? 'Enabled!' : 'Disabled!'}`);

/**
 * Log auth status
 */
log.info(`[Auth] ${authDisabled ? 'Disabled!' : 'Enabled!'}`);

/**
 * Log printer status
 */
log.info(`[Printer] ${printerType !== '' ? `Enabled! Type: ${printerType}` : 'Disabled!'}`);

/**
 * Log email status
 */
if(smtpFrom !== '' && smtpHost !== '' && smtpPort !== '') {
    log.info(`[Email] Enabled! SMTP Server: ${smtpHost}:${smtpPort}`);
} else {
    log.info(`[Email] Disabled!`);
}

/**
 * Initialize JWT
 */
if(!authDisabled && (oidcIssuerBaseUrl === '' && oidcAppBaseUrl === '' && oidcClientId === '')) {
    jwt.init();
}

/**
 * Log controller
 */
log.info(`[UniFi] Using Controller on: ${config('unifi_ip') || process.env.UNIFI_IP || '192.168.1.1'}:${config('unifi_port') || process.env.UNIFI_PORT || 443} (Site ID: ${config('unifi_site_id') || process.env.UNIFI_SITE_ID || 'default'})`);

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
 * Initialize OIDC
 */
if(!authDisabled && (oidcIssuerBaseUrl !== '' && oidcAppBaseUrl !== '' && oidcClientId !== '')) {
    oidc.init(app);
}

/**
 * Enable multer
 */
app.use(multer().none());

/**
 * Enable cookie-parser
 */
app.use(cookieParser());

/**
 * Enable flash-message
 */
app.use(flashMessage);

/**
 * Request logger
 */
app.use((req, res, next) => {
    log.info(`[Web]: ${req.originalUrl}`);
    next();
});

/**
 * Serve static public dir
 */
app.use(express.static(`${__dirname}/public`));

/**
 * Configure routers
 */
app.get('/', (req, res) => {
    if(webService) {
        res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
    } else {
        res.status(501).send();
    }
});

// Check if web service is enabled
if(webService) {
    if(oidcIssuerBaseUrl === '' && oidcAppBaseUrl === '' && oidcClientId === '') {
        app.get('/login', (req, res) => {
            // Check if authentication is disabled
            if (authDisabled) {
                res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                return;
            }

            const hour = new Date().getHours();
            const timeHeader = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

            res.render('login', {
                baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
                error: req.flashMessage.type === 'error',
                error_text: req.flashMessage.message || '',
                app_header: timeHeader
            });
        });
        app.post('/login', async (req, res) => {
            if (typeof req.body === "undefined") {
                res.status(400).send();
                return;
            }

            const passwordCheck = req.body.password === (process.env.AUTH_PASSWORD || "0000");

            if (!passwordCheck) {
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Password Invalid!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/login`);
                return;
            }

            res.cookie('authorization', jwt.sign(), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
        });
    }
    app.post('/voucher', [authorization.web], async (req, res) => {
        if (typeof req.body === "undefined") {
            res.status(400).send();
            return;
        }

        if(req.body['voucher-type'] !== 'custom') {
            const typeCheck = (config('voucher_types') || process.env.VOUCHER_TYPES || '480,1,,,;').split(';').includes(req.body['voucher-type']);

            if (!typeCheck) {
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Unknown Type!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
                return;
            }
        }

        // Create voucher code
        const voucherCode = await unifi.create(types(req.body['voucher-type'] === 'custom' ? `${req.body['voucher-duration']},${req.body['voucher-usage']},${req.body['voucher-upload-limit']},${req.body['voucher-download-limit']},${req.body['voucher-data-limit']};` : req.body['voucher-type'], true), parseInt(req.body['voucher-amount'])).catch((e) => {
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
        const voucher = cache.vouchers.find((e) => {
            return e._id === req.params.id;
        });

        if(voucher) {
            const doc = new PDFDocument({
                bufferPages: true,
                size: [226.77165354330398, 290],
                margins : {
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 20
                }
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                let pdfData = Buffer.concat(buffers);
                res.writeHead(200, {
                    'Content-Length': Buffer.byteLength(pdfData),
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment;filename=voucher_${req.params.id}.pdf`
                }).end(pdfData);
            });

            doc.image('public/images/logo_grayscale.png', 75, 15, {fit: [75, 75], align: 'center', valign: 'center'});

            doc.moveDown(6);

            doc.font('Helvetica-Bold')
                .fontSize(20)
                .text(`WiFi Voucher Code`, {
                    align: 'center'
                });
            doc.font('Helvetica-Bold')
                .fontSize(15)
                .text(`${voucher.code.slice(0, 5)}-${voucher.code.slice(5)}`, {
                    align: 'center'
                });

            doc.moveDown(2);

            doc.font('Helvetica-Bold')
                .fontSize(12)
                .text(`Voucher Details`);

            doc.font('Helvetica-Bold')
                .fontSize(10)
                .text(`--------------------------------------------------------`);

            doc.font('Helvetica-Bold')
                .fontSize(10)
                .text(`Type: `, {
                    continued: true
                });
            doc.font('Helvetica')
                .fontSize(10)
                .text(voucher.quota === 0 ? 'Multi-use' : 'Single-use');

            doc.font('Helvetica-Bold')
                .fontSize(10)
                .text(`Duration: `, {
                    continued: true
                });
            doc.font('Helvetica')
                .fontSize(10)
                .text(time(voucher.duration));

            if(voucher.qos_usage_quota) {
                doc.font('Helvetica-Bold')
                    .fontSize(10)
                    .text(`Data Limit: `, {
                        continued: true
                    });
                doc.font('Helvetica')
                    .fontSize(10)
                    .text(`${bytes(voucher.qos_usage_quota, 2)}`);
            }

            if(voucher.qos_rate_max_down) {
                doc.font('Helvetica-Bold')
                    .fontSize(10)
                    .text(`Download Limit: `, {
                        continued: true
                    });
                doc.font('Helvetica')
                    .fontSize(10)
                    .text(`${bytes(voucher.qos_rate_max_down, 1, true)}`);
            }

            if(voucher.qos_rate_max_up) {
                doc.font('Helvetica-Bold')
                    .fontSize(10)
                    .text(`Upload Limit: `, {
                        continued: true
                    });
                doc.font('Helvetica')
                    .fontSize(10)
                    .text(`${bytes(voucher.qos_rate_max_up, 1, true)}`);
            }

            doc.end();
        } else {
            res.status(404);
            res.render('404', {
                baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''
            });
        }
    });
    app.get('/voucher/:id/email', [authorization.web], async (req, res) => {
        const voucher = cache.vouchers.find((e) => {
            return e._id === req.params.id;
        });

        if(voucher) {
            res.render('components/email', {
                baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
                timeConvert: time,
                bytesConvert: bytes,
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
        if (typeof req.body === "undefined") {
            res.status(400).send();
            return;
        }

        const voucher = cache.vouchers.find((e) => {
            return e._id === req.params.id;
        });

        if(voucher) {
            await mail.send(req.body.email, voucher);
            res.cookie('flashMessage', JSON.stringify({type: 'info', message: 'Email has been send!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/vouchers`);
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

        res.render('voucher', {
            baseUrl: req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : '',
            info: req.flashMessage.type === 'info',
            info_text: req.flashMessage.message || '',
            error: req.flashMessage.type === 'error',
            error_text: req.flashMessage.message || '',
            timeConvert: time,
            bytesConvert: bytes,
            email_enabled: smtpFrom !== '' && smtpHost !== '' && smtpPort !== '',
            printer_enabled: printerType !== '',
            voucher_types: voucherTypes,
            voucher_custom: voucherCustom,
            vouchers: cache.vouchers,
            updated: cache.updated
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
}

if(apiService) {
    app.get('/api', (req, res) => {
        res.json({
            error: null,
            data: {
                message: 'OK',
                endpoints: [
                    '/api',
                    '/api/types',
                    '/api/voucher/:type',
                    '/api/vouchers'
                ]
            }
        });
    });
    app.get('/api/types', (req, res) => {
        res.json({
            error: null,
            data: {
                message: 'OK',
                types: voucherTypes
            }
        });
    });
    app.get('/api/voucher/:type', [authorization.api], async (req, res) => {
        const typeCheck = (process.env.VOUCHER_TYPES || '480,1,,,;').split(';').includes(req.params.type);

        if(!typeCheck) {
            res.json({
                error: 'Unknown Type!',
                data: {}
            });
            return;
        }

        // Create voucher code
        const voucherCode = await unifi.create(types(req.params.type, true)).catch((e) => {
            res.json({
                error: e,
                data: {}
            });
        });

        await updateCache();

        if(voucherCode) {
            res.json({
                error: null,
                data: {
                    message: 'OK',
                    voucher: voucherCode
                }
            });
        }
    });
    app.get('/api/vouchers', [authorization.api], async (req, res) => {
        res.json({
            error: null,
            data: {
                message: 'OK',
                vouchers: cache.vouchers.map((voucher) => {
                    return {
                        code: `${voucher.code.slice(0, 5)}-${voucher.code.slice(5)}`,
                        type: voucher.quota === 0 ? 'multi' : 'single',
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

/**
 * Import base packages
 */
const os = require('os');
const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');

/**
 * Import own modules
 */
const logo = require('./modules/logo');
const types = require('./modules/types');
const time = require('./modules/time');
const unifi = require('./modules/unifi');

/**
 * Import own middlewares
 */
const authorization = require('./middlewares/authorization');
const flashMessage = require('./middlewares/flashMessage');
const sid = require('./middlewares/sid');

/**
 * Setup Express app
 */
const app = express();

/**
 * Define global functions and variables
 */
const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;
const voucherTypes = types(process.env.VOUCHER_TYPES || '480,0,,,;');
const webService = (process.env.SERVICE_WEB === 'true') || true;
const apiService = (process.env.SERVICE_API === 'true') || false;
const authDisabled = (process.env.DISABLE_AUTH === 'true') || false;

/**
 * Output logo
 */
logo();

/**
 * Log service status
 */
console.log(`[Service][Web] ${webService ? 'Enabled!' : 'Disabled!'}`);
console.log(`[Service][Api] ${apiService ? 'Enabled!' : 'Disabled!'}`);

/**
 * Log voucher types
 */
console.log('[VoucherType] Loaded the following types:');
voucherTypes.forEach((type, key) => {
    console.log(`[VoucherType][${key}] ${time(type.expiration)}, ${type.usage === '1' ? 'single-use' : 'multi-use'}${typeof type.upload === "undefined" && typeof type.download === "undefined" && typeof type.megabytes === "undefined" ? ', no limits' : `${typeof type.upload !== "undefined" ? `, upload bandwidth limit: ${type.upload} kb/s` : ''}${typeof type.download !== "undefined" ? `, download bandwidth limit: ${type.download} kb/s` : ''}${typeof type.megabytes !== "undefined" ? `, quota limit: ${type.megabytes} mb` : ''}`}`);
});

/**
 * Log auth status
 */
console.log(`[Auth] ${authDisabled ? 'Disabled!' : 'Enabled!'}`);

/**
 * Log controller
 */
console.log(`[UniFi] Using Controller on: ${process.env.UNIFI_IP || '192.168.1.1'}:${process.env.UNIFI_PORT || 443} (Site ID: ${process.env.UNIFI_SITE_ID || 'default'})`);

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
 * Enable session id
 */
app.use(sid);

/**
 * Request logger
 */
app.use((req, res, next) => {
    if(req.originalUrl.includes('/images') || req.originalUrl.includes('/dist') || req.originalUrl.includes('/manifest')) {
        console.log(`[Web]: ${req.originalUrl}`);
    } else {
        console.log(`[Web][${req.sid}]: ${req.originalUrl}`);
    }

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
        res.redirect(302, '/voucher');
    } else {
        res.status(501).send();
    }
});

// Check if web service is enabled
if(webService) {
    app.get('/login', (req, res) => {
        // Check if authentication is disabled
        if (authDisabled) {
            res.redirect(302, '/voucher');
            return;
        }

        const hour = new Date().getHours();
        const timeHeader = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

        res.render('login', {
            error: req.flashMessage.type === 'error',
            error_text: req.flashMessage.message || '',
            banner_image: process.env.BANNER_IMAGE || `/images/bg-${random(1, 10)}.jpg`,
            app_header: timeHeader,
            sid: req.sid
        });
    });
    app.post('/login', async (req, res) => {
        if (typeof req.body === "undefined") {
            res.status(400).send();
            return;
        }

        const passwordCheck = req.body.password === (process.env.SECURITY_CODE || "0000");

        if(!passwordCheck) {
            res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Password Invalid!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, '/login');
            return;
        }

        res.cookie('authorization', req.body.password, {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, '/voucher');
    });
    app.get('/voucher', [authorization.web], async (req, res) => {
        const hour = new Date().getHours();
        const timeHeader = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

        res.render('voucher', {
            info: req.flashMessage.type === 'info',
            info_text: req.flashMessage.message || '',
            error: req.flashMessage.type === 'error',
            error_text: req.flashMessage.message || '',
            banner_image: process.env.BANNER_IMAGE || `/images/bg-${random(1, 10)}.jpg`,
            app_header: timeHeader,
            sid: req.sid,
            timeConvert: time,
            voucher_types: voucherTypes,
            vouchers_popup: false
        });
    });
    app.post('/voucher', [authorization.web], async (req, res) => {
        if (typeof req.body === "undefined") {
            res.status(400).send();
            return;
        }

        const typeCheck = (process.env.VOUCHER_TYPES || '480,0,,,;').split(';').includes(req.body['voucher-type']);

        if(!typeCheck) {
            res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Unknown Type!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, '/voucher');
            return;
        }

        // Create voucher code
        const voucherCode = await unifi(types(req.body['voucher-type'], true)).catch((e) => {
            res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, '/voucher');
        });

        if(voucherCode) {
            res.cookie('flashMessage', JSON.stringify({type: 'info', message: `Voucher Created: ${voucherCode}`}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, '/voucher');
        }
    });
    app.get('/vouchers', [authorization.web], async (req, res) => {
        const hour = new Date().getHours();
        const timeHeader = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

        const vouchers = await unifi('', false).catch((e) => {
            res.cookie('flashMessage', JSON.stringify({type: 'error', message: e}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, '/voucher');
        });

        if (vouchers) {
            res.render('voucher', {
                info: req.flashMessage.type === 'info',
                info_text: req.flashMessage.message || '',
                error: req.flashMessage.type === 'error',
                error_text: req.flashMessage.message || '',
                banner_image: process.env.BANNER_IMAGE || `/images/bg-${random(1, 10)}.jpg`,
                app_header: timeHeader,
                sid: req.sid,
                timeConvert: time,
                voucher_types: voucherTypes,
                vouchers_popup: true,
                vouchers
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
                    '/api/voucher/:type'
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
        const typeCheck = (process.env.VOUCHER_TYPES || '480,0,,,;').split(';').includes(req.params.type);

        if(!typeCheck) {
            res.json({
                error: 'Unknown Type!',
                data: {}
            });
            return;
        }

        // Create voucher code
        const voucherCode = await unifi(types(req.params.type, true)).catch((e) => {
            res.json({
                error: e,
                data: {}
            });
        });

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
}

/**
 * Setup default 404 message
 */
app.use((req, res) => {
    res.status(404);
    res.render('404', {
        banner_image: process.env.BANNER_IMAGE || `/images/bg-${random(1, 10)}.jpg`,
        sid: req.sid
    });
});

/**
 * Disable powered by header for security reasons
 */
app.disable('x-powered-by');

/**
 * Start listening on port
 */
app.listen(3000, '0.0.0.0', () => {
    console.log(`[App] Running on: 0.0.0.0:3000`);
});

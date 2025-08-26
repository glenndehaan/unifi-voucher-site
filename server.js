/**
 * Import base packages
 */
const fs = require('fs');
const os = require('os');
const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const locale = require('express-locale');

/**
 * Import own modules
 */
const variables = require('./modules/variables');
const log = require('./modules/log');
const jwt = require('./modules/jwt');
const info = require('./modules/info');
const oidc = require('./modules/oidc');

/**
 * Import own middlewares
 */
const authorization = require('./middlewares/authorization');
const flashMessage = require('./middlewares/flashMessage');

/**
 * Import own controllers
 */
const api = require('./controllers/api');
const authentication = require('./controllers/authentication');
const bulk = require('./controllers/bulk');
const error = require('./controllers/error');
const kiosk = require('./controllers/kiosk');
const status = require('./controllers/status');
const voucher = require('./controllers/voucher');
const vouchers = require('./controllers/vouchers');

/**
 * Import own utils
 */
const {updateCache} = require('./utils/cache');
const {cleanupExpired, cleanupUnused} = require('./utils/cleanup');

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
 * Setup Base Routes
 */
app.get('/', (req, res) => {
    if(variables.serviceWeb) {
        res.redirect(302, `${req.headers['x-ingress-path'] ? req.headers['x-ingress-path'] : ''}/${variables.kioskEnabled && variables.kioskHomepage ? 'kiosk' : 'vouchers'}`);
    } else {
        res.status(501).send();
    }
});

/**
 * Setup Web Routes
 */
if(variables.serviceWeb) {
    app.get('/kiosk', kiosk.get);
    app.post('/kiosk', kiosk.post);

    app.get('/login', authentication.login.get);
    app.post('/login', authentication.login.post);
    app.get('/logout', [authorization.web], authentication.logout.get);

    app.post('/voucher', [authorization.web], voucher.voucher.post);
    app.get('/voucher/:id/remove', [authorization.web], voucher.remove.get);
    app.get('/voucher/:id/print', [authorization.web], voucher.print.get);
    app.post('/voucher/:id/print', [authorization.web], voucher.print.post);
    app.get('/voucher/:id/email', [authorization.web], voucher.email.get);
    app.post('/voucher/:id/email', [authorization.web], voucher.email.post);

    app.get('/vouchers', [authorization.web], vouchers.get);
    app.get('/voucher/:id', [authorization.web], voucher.voucher.get);

    app.get('/status', [authorization.web], status.get);

    app.get('/bulk/print', [authorization.web], bulk.print.get);
    app.post('/bulk/print', [authorization.web], bulk.print.post);
}

/**
 * Setup API Routes
 */
if(variables.serviceApi) {
    app.get('/api', api.api.get);
    app.get('/api/types', api.types.get);
    app.get('/api/languages', api.languages.get);

    app.get('/api/vouchers', [authorization.api], api.vouchers.get);
    app.post('/api/voucher', [authorization.api], api.voucher.post);
}

/**
 * Setup default 404 message
 */
app.use(error["404"]);

/**
 * Setup default 500 message
 */
app.use(error["500"]);

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

    // Run tasks every 15 minutes
    setInterval(async () => {
        log.debug('[Task][Sync] Starting...');
        await updateCache();

        if(variables.taskCleanupExpired) {
            log.debug('[Task][Cleanup][Expired] Starting...');
            await cleanupExpired();
        }

        if(variables.taskCleanupUnused) {
            log.debug('[Task][Cleanup][Unused] Starting...');
            await cleanupUnused();
        }
    }, 900000);
});

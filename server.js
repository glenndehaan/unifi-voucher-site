/**
 * Import base packages
 */
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const app = express();

/**
 * Import own modules
 */
const logo = require('./modules/logo');
const types = require('./modules/types');
const unifi = require('./modules/unifi');

/**
 * Define global functions and variables
 */
const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;
const voucherTypes = types(process.env.VOUCHER_TYPES || '480,0,,,;');

/**
 * Output logo
 */
logo();

/**
 * Log voucher types
 */
console.log('[VoucherType] Loaded the following types:');
voucherTypes.forEach((type, key) => {
    console.log(`[VoucherType][${key}] ${type.expiration} minutes, ${type.usage === '1' ? 'single-use' : 'multi-use'}${typeof type.upload === "undefined" && typeof type.download === "undefined" && typeof type.megabytes === "undefined" ? ', no limits' : `${typeof type.upload !== "undefined" ? `, upload bandwidth limit: ${type.upload} kb/s` : ''}${typeof type.download !== "undefined" ? `, download bandwidth limit: ${type.download} kb/s` : ''}${typeof type.megabytes !== "undefined" ? `, quota limit: ${type.megabytes} mb` : ''}`}`);
});

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
 * Enable multer
 */
app.use(multer().none());

/**
 * Request logger
 */
app.use((req, res, next) => {
    console.log(`[Web]: ${req.originalUrl}`);
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
    const hour = new Date().getHours();
    const timeHeader = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

    res.render('home', {
        error: typeof req.query.error === 'string' && req.query.error !== '',
        error_text: req.query.error || '',
        banner_image: process.env.BANNER_IMAGE || `/images/bg-${random(1, 10)}.jpg`,
        app_header: timeHeader,
        sid: uuidv4(),
        voucher_types: voucherTypes
    });
});
app.post('/', async (req, res) => {
    const check = req.body.password === (process.env.SECURITY_CODE || "0000");

    if(!check) {
        res.redirect(encodeURI(`/?error=Invalid password!`));
        return;
    }

    res.redirect(encodeURI(`/voucher?code=${req.body.password}&type=${req.body['voucher-type']}`));
});
app.get('/voucher', async (req, res) => {
    if(req.query.code !== (process.env.SECURITY_CODE || "0000")) {
        res.status(403).send();
        return;
    }

    const hour = new Date().getHours();
    const timeHeader = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    const voucherCode = await unifi(types(req.query.type, true));

    res.render('voucher', {
        error: typeof req.query.error === 'string' && req.query.error !== '',
        error_text: req.query.error || '',
        banner_image: process.env.BANNER_IMAGE || `/images/bg-${random(1, 10)}.jpg`,
        app_header: timeHeader,
        code: req.query.code,
        type: req.query.type,
        voucher_code: voucherCode,
        sid: uuidv4()
    });
});

/**
 * Setup default 404 message
 */
app.use((req, res) => {
    res.status(404);
    res.send('Not Found!');
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

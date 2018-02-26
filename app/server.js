/**
 * Import base packages
 */
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const browsersupport = require('express-browsersupport');

/**
 * Import own packages
 */
const config = require('./config/config');
const webRouter = require('./routers/Web');
const apiRouter = require('./routers/Api');
const indexController = require('./controllers/Web/IndexController');

/**
 * Set template engine
 */
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);

/**
 * Serve static public dir
 */
app.use(express.static(`${__dirname}/../public`));

/**
 * Configure app to use bodyParser()
 */
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

/**
 * Configure sessions in app
 */
app.use(session({secret: config.session.secret, resave: true, saveUninitialized: true}));

/**
 * Configure app to use Browser Support
 */
app.use(browsersupport({
    redirectUrl: "/oldbrowser",
    supportedBrowsers: config.application.supportedBrowsers
}));

/**
 * Configure routers
 */
app.use('/', webRouter.router);
app.use('/api', apiRouter.router);

/**
 * Render sitemap.xml and robots.txt
 */
app.get('/sitemap.xml', (req, res) => {
    indexController.siteMapAction(req, res, webRouter.routes);
});
app.get('/robots.txt', (req, res) => {
    indexController.robotsAction(req, res);
});

/**
 * Render old browser page
 */
app.get('/oldbrowser', (req, res) => {
    indexController.oldBrowserAction(req, res);
});

/**
 * Setup default 404 message
 */
app.use((req, res) => {
    res.status(404);

    // respond with json
    if (req.originalUrl.split('/')[1] === 'api') {

        /**
         * API 404 not found
         */
        res.send({error: 'This API route is not implemented yet'});
        return;
    }

    indexController.notFoundAction(req, res);
});

/**
 * Disable powered by header for security reasons
 */
app.disable('x-powered-by');

/**
 * Start listening on port
 */
const server = app.listen(config.application.port, config.application.bind, () => {
    console.log(`[NODE] App is running on: ${config.application.bind}:${config.application.port}`);
});

/**
 * Handle nodemon shutdown
 */
process.once('SIGUSR2', () => {
    server.close(() => {
        console.log(`[NODE] Express exited! Port ${config.application.port} is now free!`);
        process.kill(process.pid, 'SIGUSR2');
    });
});

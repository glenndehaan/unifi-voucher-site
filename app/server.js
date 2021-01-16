/**
 * Import base packages
 */
const express = require('express');
const app = express();

/**
 * Import own packages
 */
const config = require('./config/config');
const socket = require('./modules/Socket');
const IndexController = require('./controllers/IndexController');

/**
 * Set template engine
 */
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);

/**
 * Trust proxy
 */
app.enable('trust proxy');

/**
 * Serve static public dir
 */
app.use(express.static(`${__dirname}/../public`));

/**
 * Configure routes
 */
app.get('/', (req, res) => {
    IndexController.indexAction(req, res);
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
 * Init socket connection
 */
global.socket = new socket(server);

/**
 * Handle nodemon shutdown
 */
process.once('SIGUSR2', () => {
    server.close(() => {
        console.log(`[NODE] Express exited! Port ${config.application.port} is now free!`);
        process.kill(process.pid, 'SIGUSR2');
    });
});

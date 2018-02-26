/**
 * Import base packages
 */
const express = require('express');
const router = express.Router();
const routerUtils = require('../helpers/modules/Router');

/**
 * Define routes
 */
const routes = [
    {
        route: '/',
        method: 'get',
        controller: 'Index',
        action: 'index'
    }
];

routerUtils.routesToRouter(router, routes, 'Web');

module.exports = {router, routes};

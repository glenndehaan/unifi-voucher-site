/**
 * Import vendor modules
 */
const querystring = require('node:querystring');
const {Agent} = require('undici');

/**
 * Import own modules
 */
const cache = require('../modules/cache');
const variables = require('../modules/variables');
const log = require('../modules/log');

/**
 * Request a Controller Site UUID
 *
 * @returns {Promise<unknown>}
 */
const getSiteUUID = () => {
    return new Promise((resolve, reject) => {
        fetch(`https://${variables.unifiIp}:${variables.unifiPort}/proxy/network/integration/v1/sites?filter=internalReference.eq('${variables.unifiSiteId}')`, {
            headers: {
                'User-Agent': 'unifi-voucher-site',
                'Content-Type': 'application/json',
                'X-API-KEY': variables.unifiToken
            },
            dispatcher: new Agent({
                connect: {
                    rejectUnauthorized: false
                }
            })
        })
            .then((response) => {
                return response.json();
            })
            .then((response) => {
                if(response.error) {
                    log.error(`[UniFi] Error while requesting site uuid. Error: ${response.error.message}`);
                    log.debug(response.error);
                    reject(response.error.message);
                    return;
                }

                if(response.statusCode) {
                    log.error(`[UniFi] Error while requesting site uuid. Error: ${response.message}`);
                    log.debug(response);
                    reject(response.message);
                    return;
                }

                if(response.data.length < 1) {
                    log.error(`[UniFi] Unknown site id: ${variables.unifiSiteId}.`);
                    log.debug(response);
                    reject(`Unknown site id: ${variables.unifiSiteId}`);
                    return;
                }

                log.debug(`[UniFi] Site UUID: ${response.data[0].id}`);
                resolve(response.data[0].id);
            })
            .catch((err) => {
                log.error('[UniFi] Error while processing request.');
                log.debug(err);
                reject(err);
            });
    });
}

/**
 * Fetch util to get data from a UniFi Controller
 *
 * @param endpoint
 * @param method
 * @param params
 * @param data
 * @returns {Promise<unknown>}
 */
module.exports = (endpoint, method = 'GET', params = {}, data = null) => {
    return new Promise(async (resolve, reject) => {
        // Auto-resolve siteUUID if not set
        if(cache.unifi.siteUUID === null) {
            log.debug('[UniFi] Requesting Site UUID...');

            const siteUUID = await getSiteUUID().catch((err) => {
                reject(err);
            });

            if(siteUUID) {
                cache.unifi.siteUUID = siteUUID;
            } else {
                return;
            }
        }

        // Define base request
        const request = {
            method,
            headers: {
                'User-Agent': 'unifi-voucher-site',
                'Content-Type': 'application/json',
                'X-API-KEY': variables.unifiToken
            },
            dispatcher: new Agent({
                connect: {
                    rejectUnauthorized: false
                }
            })
        };

        // Add data to body when object is given
        if(data !== null) {
            request.body = JSON.stringify(data);
        }

        fetch(`https://${variables.unifiIp}:${variables.unifiPort}/proxy/network/integration/v1/sites/${cache.unifi.siteUUID}${endpoint}?${querystring.stringify(params)}`, request)
            .then((response) => {
                return response.json();
            })
            .then((response) => {
                if(response.error) {
                    log.error(`[UniFi] Error while processing request. Error: ${response.error.message}`);
                    log.debug(response.error);
                    reject(response.error.message);
                    return;
                }

                if(response.statusCode) {
                    log.error(`[UniFi] Error while processing request. Error: ${response.message}`);
                    log.debug(response);
                    reject(response.message);
                    return;
                }

                if(response.data) {
                    resolve(response.data);
                } else {
                    resolve(response);
                }
            })
            .catch((err) => {
                log.error(`[UniFi] Error while processing request. Error: ${err}`);
                log.debug(err);
                reject(err.message);
            });
    });
}

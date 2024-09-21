/**
 * Import vendor modules
 */
const QRCode = require('qrcode');

/**
 * Import own modules
 */
const variables = require('./variables');

/**
 * Generates a QR code from the UniFi SSID (Scan to Connect)
 *
 * @return {Promise<unknown>}
 */
module.exports = () => {
    return new Promise((resolve) => {
        QRCode.toDataURL(`WIFI:S:${variables.unifiSsid};T:;P:;;`, (err, url) => {
            resolve(url);
        });
    });
};

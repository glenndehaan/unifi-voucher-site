/**
 * Import vendor modules
 */
const QRCode = require('qrcode');

/**
 * Import own modules
 */
const log = require('./log');
const variables = require('./variables');

/**
 * Generates a QR code from the UniFi SSID (Scan to Connect)
 *
 * @param buffer
 * @return {Promise<unknown>}
 */
module.exports = (buffer = false, options = {}) => {
    // Define QR Content based on Wi-Fi Security Standard
    const qrText = variables.unifiSsidPassword !== '' ? `WIFI:S:${variables.unifiSsid};T:WPA;P:${variables.unifiSsidPassword};;` : `WIFI:S:${variables.unifiSsid};;`;
    const qrOptions = {
        version: 6,
        errorCorrectionLevel: 'Q',
        ...options,
    };

    return new Promise((resolve) => {
        if(!buffer) {
            QRCode.toDataURL(qrText, qrOptions, (err, url) => {
                if(err) {
                    log.error(`[Qr] Error while generating code!`);
                    log.error(err);
                }

                resolve(url);
            });
        } else {
            QRCode.toBuffer(qrText, qrOptions, (err, buffer) => {
                if(err) {
                    log.error(`[Qr] Error while generating code!`);
                    log.error(err);
                }

                resolve(buffer);
            });
        }
    });
};

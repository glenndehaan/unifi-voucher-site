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
module.exports = (buffer = false) => {
    // Define QR Content based on Wi-Fi Security Standard
    const qrText = variables.unifiSsidPassword !== '' ? `WIFI:S:${variables.unifiSsid};T:WPA;P:${variables.unifiSsidPassword};;` : `WIFI:S:${variables.unifiSsid};;`;

    return new Promise((resolve) => {
        if(!buffer) {
            QRCode.toDataURL(qrText, { version: 4, errorCorrectionLevel: 'Q' }, (err, url) => {
                if(err) {
                    log.error(`[Qr] Error while generating code!`);
                    log.error(err);
                }

                resolve(url);
            });
        } else {
            QRCode.toBuffer(qrText, { version: 4, errorCorrectionLevel: 'Q' }, (err, buffer) => {
                if(err) {
                    log.error(`[Qr] Error while generating code!`);
                    log.error(err);
                }

                resolve(buffer);
            });
        }
    });
};

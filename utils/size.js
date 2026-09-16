/**
 * Import own modules
 */
const variables = require('../modules/variables');

/**
 * Util function to calculate paper size based on voucher data
 */
module.exports = (voucher) => {
    let base = variables.unifiSsid !== '' ? variables.unifiSsidPassword !== '' ? 370 : 360 : 250;

    // Remove space for logo and qr based on layout
    if(variables.printersLayout === 'slim_qr' || variables.printersLayout === 'slim') {
        base -= 90;
    }
    if(variables.unifiSsid !== '' && variables.printersLayout === 'slim') {
        base -= 90;
    }

    if(voucher.dataUsageLimitMBytes) {
        base += 10;
    }

    if(voucher.rxRateLimitKbps) {
        base += 10;
    }

    if(voucher.txRateLimitKbps) {
        base += 10;
    }

    return base;
}

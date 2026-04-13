/**
 * Import own modules
 */
const variables = require('../modules/variables');

/**
 * Util function to calculate paper size based on voucher data
 */
module.exports = (voucher) => {
    let base = variables.unifiSsid !== '' ? variables.unifiSsidPassword !== '' ? 415 : 375 : 260;

    // Remove space for logo and qr based on layout
    if(variables.printersLayout === 'slim_qr' || variables.printersLayout === 'slim') {
        base -= 81;
    }
    if(variables.printersLayout === 'slim') {
        base -= 85;
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

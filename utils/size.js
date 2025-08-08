/**
 * Import own modules
 */
const variables = require('../modules/variables');

/**
 * Util function to calculate paper size based on voucher data
 */
module.exports = (voucher) => {
    let base = variables.unifiSsid !== '' ? variables.unifiSsidPassword !== '' ? 415 : 375 : 260;

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

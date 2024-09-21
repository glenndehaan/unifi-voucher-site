/**
 * Util function to calculate paper size based on voucher data
 */
module.exports = (voucher) => {
    let base = 375;

    if(voucher.qos_usage_quota) {
        base += 10;
    }

    if(voucher.qos_rate_max_down) {
        base += 10;
    }

    if(voucher.qos_rate_max_up) {
        base += 10;
    }

    return base;
}

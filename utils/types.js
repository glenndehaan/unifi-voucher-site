/**
 * Returns an array or object of voucher type(s)
 *
 * @param string
 * @param single
 * @returns {*}
 */
module.exports = (string, single = false) => {
    if(single) {
        const match = string.match(/^(?<expiration>\d+)?,(?<usage>\d+)?,(?<upload>\d+)?,(?<download>\d+)?,(?<megabytes>\d+)?/);
        return match.groups.expiration ? {...match.groups, raw: string} : undefined;
    }

    const types = string.split(';');

    return types.filter(n => n).map((type) => {
        const match = type.match(/^(?<expiration>\d+)?,(?<usage>\d+)?,(?<upload>\d+)?,(?<download>\d+)?,(?<megabytes>\d+)?/);
        return match.groups.expiration ? {...match.groups, raw: type} : undefined;
    }).filter(n => n);
}

/**
 * Converts bytes to a human readable format
 *
 * @param bytes
 * @param type
 * @param perSecond
 * @param decimals
 * @return {string}
 */
module.exports = (bytes, type = 0, perSecond = false, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1000;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb'].toSpliced(0, type);

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    const suffix = perSecond ? sizes[i] + 'ps' : sizes[i].toUpperCase();

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + suffix;
}

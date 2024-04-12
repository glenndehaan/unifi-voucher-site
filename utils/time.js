/**
 * Convert time minutes
 *
 * @param minutes
 * @returns {string}
 */
module.exports = (minutes) => {
    if (minutes < 60) {
        return `${minutes} minute(s)`;
    }

    const hours = minutes / 60;

    if (hours < 24) {
        return `${hours % 1 === 0 ? hours : hours.toFixed(2)} ${(hours > 1) ? 'hours' : 'hour'}`;
    }

    const days = hours / 24;
    return `${days} ${(days > 1) ? 'days' : 'day'}`;
}

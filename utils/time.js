/**
 * Import own modules
 */
const translation = require('../modules/translation');

/**
 * Convert time minutes
 *
 * @param minutes
 * @param language
 * @returns {string}
 */
module.exports = (minutes, language = 'en') => {
    // Create new translator
    const t = translation('time', language);

    if (minutes < 60) {
        return `${minutes} ${minutes > 1 ? t('minutes') : t('minute')}`;
    }

    const hours = minutes / 60;

    if (hours < 24) {
        return `${hours % 1 === 0 ? hours : hours.toFixed(2)} ${(hours > 1) ? t('hours') : t('hour')}`;
    }

    const days = hours / 24;

    if (days < 365) {
        return `${days % 1 === 0 ? days : days.toFixed(2)} ${(days > 1) ? t('days') : t('day')}`;
    }

    const years = days / 365;
    return `${years % 1 === 0 ? years : years.toFixed(2)} ${(years > 1) ? t('years') : t('year')}`;
}

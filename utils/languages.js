/**
 * Import own modules
 */
const variables = require('../modules/variables');

/**
 * Filter hidden languages from the list
 *
 * @param languages
 * @returns {*}
 */
const filterLanguages = (languages) => {
    Object.keys(languages).forEach(language => {
        if(variables.translationHiddenLanguages.includes(language)) {
            delete languages[language];
        }
    });

    return languages;
};

/**
 * Exports all languages
 */
module.exports = filterLanguages({
    en: '🇺🇸 English',
    br: '🇧🇷 Brazilian, Portuguese',
    da: '🇩🇰 Danish',
    de: '🇩🇪 German',
    es: '🇪🇸 Spanish',
    fi: '🇫🇮 Finnish',
    fr: '🇫🇷 French',
    nl: '🇳🇱 Dutch',
    pl: '🇵🇱 Polish',
    pt: '🇵🇹 Portuguese',
    ru: '🇷🇺 Russian'
});

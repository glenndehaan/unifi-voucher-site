/**
 * Import base packages
 */
const fs = require('fs');

/**
 * Import own modules
 */
const variables = require('./variables');

/**
 * Translation returns translator function
 *
 * @param language
 * @param module
 * @return {(function(key: string): (string))}
 */
module.exports = (language = 'en', module) => {
    // Check if translation file exists
    if(!fs.existsSync(`${__dirname}/../locales/${language}/${module}.json`)) {
        throw new Error(`[Translation] Missing translation file: ${__dirname}/../locales/${language}/${module}.json`);
    }

    // Get locales mapping
    const locales = JSON.parse(fs.readFileSync(`${__dirname}/../locales/_locales.json`, 'utf-8'));
    // Get translation file
    const translations = JSON.parse(fs.readFileSync(`${__dirname}/../locales/${language}/${module}.json`, 'utf-8'));

    // Return translate function
    return (key) => {
        if(key === '_locales') {
            return locales;
        }

        // Check if key exists within translation file
        if(typeof translations[key] === 'undefined') {
            throw new Error(`[Translation][${language}] Missing for key: ${key}`);
        }

        // Check if debugging is enabled. If enabled only return key
        return variables.translationDebug ? `%${key}%` : translations[key];
    };
};

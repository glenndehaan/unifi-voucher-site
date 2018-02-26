import settings from './settings';

// Create global
window.site = {};
site.settings = settings;

function initialize() {
    site.html = document.querySelector('html');
    site.body = document.querySelector('body');

    console.log('JS Start');

    initializeModules();
}

/**
 * Initialize the modules with all the components
 */
function initializeModules() {
    for(let modulesItem = 0; modulesItem < settings.modules.length; modulesItem++) {
        const module = settings.modules[modulesItem];

        const moduleClass = require(`./modules/${module.group}/${module.module}`);
        const domElements = document.querySelectorAll(module.el);

        if (typeof moduleClass !== 'undefined' && domElements.length > 0) {
            new moduleClass({
                el: domElements
            });
        }
    }
}

document.addEventListener("DOMContentLoaded", initialize);

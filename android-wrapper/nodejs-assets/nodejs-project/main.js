/**
 * Entry point for nodejs-mobile
 * This file is loaded by the Android app and starts the Express server.
 */

const path = require('path');
const fs = require('fs');

// Set up environment
process.env.NODE_ENV = 'production';

// Get the app data directory from Android (passed as argument or default)
const appDataDir = process.argv[2] || path.dirname(__dirname);

// Check for options.json in the app data directory
const optionsPath = path.join(appDataDir, 'options.json');
if (fs.existsSync(optionsPath)) {
    // Copy to the expected location for the server
    const serverOptionsPath = path.join(__dirname, '.options.json');
    try {
        fs.copyFileSync(optionsPath, serverOptionsPath);
        console.log('[nodejs-mobile] Configuration loaded from', optionsPath);
    } catch (err) {
        console.error('[nodejs-mobile] Error copying options:', err);
    }
}

// Log startup
console.log('[nodejs-mobile] Starting UniFi Voucher server...');
console.log('[nodejs-mobile] Working directory:', __dirname);
console.log('[nodejs-mobile] Node version:', process.version);

// Change to the server directory
process.chdir(__dirname);

// Start the server
try {
    require('./server.js');
    console.log('[nodejs-mobile] Server module loaded successfully');
} catch (err) {
    console.error('[nodejs-mobile] Failed to start server:', err);
    process.exit(1);
}

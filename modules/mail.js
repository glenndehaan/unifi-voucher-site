/**
 * Import vendor modules
 */
const fs = require('fs');
const ejs = require('ejs');
const nodemailer = require('nodemailer');

/**
 * Import own modules
 */
const variables = require('./variables');
const log = require('./log');
const qr = require('./qr');

/**
 * Import own utils
 */
const time = require('../utils/time');
const bytes = require('../utils/bytes');

/**
 * Create nodemailer transport
 */
const transport = nodemailer.createTransport({
    host: variables.smtpHost,
    port: parseInt(variables.smtpPort),
    secure: (variables.smtpSecure === 'true' || variables.smtpSecure === true),
    auth: {
        user: variables.smtpUsername,
        pass: variables.smtpPassword
    }
});

/**
 * Mail module functions
 */
module.exports = {
    /**
     * Sends an email via the nodemailer transport
     *
     * @param to
     * @param voucher
     * @return {Promise<unknown>}
     */
    send: (to, voucher) => {
        return new Promise(async (resolve, reject) => {
            const result = await transport.sendMail({
                from: variables.smtpFrom,
                to: to,
                subject: 'WiFi Voucher Code',
                text: `Hi there,\n\nSomeone generated a WiFi Voucher, please use this code when connecting:\n\n${voucher.code.slice(0, 5)}-${voucher.code.slice(5)}`,
                html: ejs.render(fs.readFileSync(`${__dirname}/../template/email/voucher.ejs`, 'utf-8'), {
                    voucher,
                    unifiSsid: variables.unifiSsid,
                    qr: await qr(),
                    timeConvert: time,
                    bytesConvert: bytes
                })
            }).catch((e) => {
                log.error(`[Mail] Error when sending mail`);
                log.error(e);
                reject(`[Mail] ${e.message}`);
            });

            if(result) {
                log.info(`[Mail] Sent to: ${to}`);
                resolve(true);
            }
        });
    }
};

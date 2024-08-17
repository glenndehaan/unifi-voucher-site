/**
 * Import vendor modules
 */
const fs = require('fs');
const ejs = require('ejs');
const nodemailer = require('nodemailer');

/**
 * Import own modules
 */
const config = require('./config');
const log = require('./log');

/**
 * Define global variables
 */
const smtpFrom = config('smtp_from') || process.env.SMTP_FROM || '';
const smtpHost = config('smtp_host') || process.env.SMTP_HOST || '';
const smtpPort = config('smtp_port') || process.env.SMTP_PORT || 25;
const smtpSecure = config('smtp_secure') || process.env.SMTP_SECURE || false;
const smtpUsername = config('smtp_username') || process.env.SMTP_USERNAME || '';
const smtpPassword = config('smtp_password') || process.env.SMTP_PASSWORD || '';

/**
 * Create nodemailer transport
 */
const transport = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: (smtpSecure === 'true' || smtpSecure === true),
    auth: {
        user: smtpUsername,
        pass: smtpPassword
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
        return new Promise(async (resolve) => {
            await transport.sendMail({
                from: smtpFrom,
                to: to,
                subject: 'Your WiFi Voucher',
                text: `Hi there,\n\nSomeone generated a WiFi Voucher, please use this code when connecting:\n\n${voucher.code.slice(0, 5)}-${voucher.code.slice(5)}`,
                html: ejs.render(fs.readFileSync(`${__dirname}/../template/email/voucher.ejs`, 'utf-8'), {
                    voucher
                })
            }).catch((e) => {
                log.error(`[Mail] Error when sending mail`);
                log.error(e);
            });

            resolve();
        });
    }
};

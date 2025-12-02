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
const translation = require('./translation');
const qr = require('./qr');

/**
 * Import own utils
 */
const time = require('../utils/time');
const bytes = require('../utils/bytes');

/**
 * Base SMTP config
 */
const smtpConfig = {
    host: variables.smtpHost,
    port: parseInt(variables.smtpPort),
    secure: variables.smtpSecure,
    tls: {
        rejectUnauthorized: false // Skip TLS Certificate checks for Self-Hosted systems
    }
};

/**
 * Include SMTP auth if defined
 */
if(variables.smtpUsername !== '' && variables.smtpPassword !== '') {
    smtpConfig.auth = {
        user: variables.smtpUsername,
        pass: variables.smtpPassword
    };
}

/**
 * Create nodemailer transport
 */
const transport = nodemailer.createTransport(smtpConfig);

/**
 * Mail module functions
 */
module.exports = {
    /**
     * Sends an email via the nodemailer transport
     *
     * @param to
     * @param voucher
     * @param language
     * @return {Promise<unknown>}
     */
    send: (to, voucher, language = 'en') => {
        return new Promise(async (resolve, reject) => {
            // Create new translator
            const t = translation('email', language);

            // Attempt to send mail via SMTP transport
            const result = await transport.sendMail({
                from: variables.smtpFrom,
                to: to,
                subject: t('title'),
                text: `${t('greeting')},\n\n${t('intro')}:\n\n${voucher.code.slice(0, 5)}-${voucher.code.slice(5)}`,
                html: ejs.render(fs.readFileSync(`${__dirname}/../template/email/voucher.ejs`, 'utf-8'), {
                    language,
                    t,
                    voucher,
                    unifiSsid: variables.unifiSsid,
                    unifiSsidPassword: variables.unifiSsidPassword,
                    timeConvert: time,
                    bytesConvert: bytes
                }),
                attachments: [
                    {
                        filename: 'logo.png',
                        content: fs.existsSync('/email/logo.png') ? fs.readFileSync(`/email/logo.png`) : fs.readFileSync(`${process.cwd()}/public/images/email/logo.png`),
                        cid: 'logo@unifi-voucher-site.com'
                    },
                    {
                        filename: 'qr.png',
                        content: await qr(true),
                        cid: 'qr@unifi-voucher-site.com'
                    }
                ]
            }).catch((e) => {
                log.error(`[Mail] Error when sending mail`);
                log.error(e);
                reject(`[Mail] ${e.message}`);
            });

            // Check if the email was sent successfully
            if(result) {
                log.info(`[Mail] Sent to: ${to}`);
                resolve(true);
            }
        });
    }
};

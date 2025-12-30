/**
 * Import own modules
 */
const variables = require('../modules/variables');
const cache = require('../modules/cache');
const unifi = require('../modules/unifi');
const mail = require('../modules/mail');

/**
 * Import own utils
 */
const {updateCache} = require('../utils/cache');
const types = require('../utils/types');
const languages = require('../utils/languages');
const notes = require('../utils/notes');

module.exports = {
    api: {
        /**
         * GET - /api
         *
         * @param req
         * @param res
         */
        get: (req, res) => {
            res.json({
                error: null,
                data: {
                    message: 'OK',
                    endpoints: [
                        {
                            method: 'GET',
                            endpoint: '/api'
                        },
                        {
                            method: 'GET',
                            endpoint: '/api/types'
                        },
                        {
                            method: 'GET',
                            endpoint: '/api/languages'
                        },
                        {
                            method: 'GET',
                            endpoint: '/api/vouchers'
                        },
                        {
                            method: 'POST',
                            endpoint: '/api/voucher'
                        }
                    ]
                }
            });
        }
    },

    types: {
        /**
         * GET - /api/types
         *
         * @param req
         * @param res
         */
        get: (req, res) => {
            res.json({
                error: null,
                data: {
                    message: 'OK',
                    types: types(variables.voucherTypes)
                }
            });
        }
    },

    languages: {
        /**
         * GET - /api/languages
         *
         * @param req
         * @param res
         */
        get: (req, res) => {
            res.json({
                error: null,
                data: {
                    message: 'OK',
                    languages: Object.keys(languages).map(language => {
                        return {
                            code: language,
                            name: languages[language]
                        }
                    })
                }
            });
        }
    },

    vouchers: {
        /**
         * GET - /api/vouchers
         *
         * @param req
         * @param res
         */
        get: async (req, res) => {
            res.json({
                error: null,
                data: {
                    message: 'OK',
                    vouchers: cache.vouchers.map((voucher) => {
                        return {
                            id: voucher.id,
                            code: `${voucher.code.slice(0, 5)}-${voucher.code.slice(5)}`,
                            type: !voucher.authorizedGuestLimit ? 'multi' : voucher.authorizedGuestLimit === 1 ? 'single' : 'multi',
                            duration: voucher.timeLimitMinutes,
                            data_limit: voucher.dataUsageLimitMBytes ? voucher.dataUsageLimitMBytes : null,
                            download_limit: voucher.rxRateLimitKbps ? voucher.rxRateLimitKbps : null,
                            upload_limit: voucher.txRateLimitKbps ? voucher.txRateLimitKbps : null,
                            note: notes(voucher.name).note
                        };
                    }),
                    updated: cache.updated
                }
            });
        }
    },

    voucher: {
        /**
         * POST - /api/voucher
         *
         * @param req
         * @param res
         */
        post: async (req, res) => {
            // Verify valid body is sent
            if(!req.body || !req.body.type) {
                res.status(400).json({
                    error: 'Invalid Body!',
                    data: {}
                });
                return;
            }

            // Check if email body is set
            if(req.body.email) {
                // Check if email module is enabled
                if(variables.smtpFrom === '' || variables.smtpHost === '' || variables.smtpPort === '') {
                    res.status(400).json({
                        error: 'Email Not Configured!',
                        data: {}
                    });
                    return;
                }

                // Check if email body is correct
                if(!req.body.email.language || !req.body.email.address) {
                    res.status(400).json({
                        error: 'Invalid Body!',
                        data: {}
                    });
                    return;
                }

                // Check if language is available
                if(!Object.keys(languages).includes(req.body.email.language)) {
                    res.status(400).json({
                        error: 'Unknown Language!',
                        data: {}
                    });
                    return;
                }
            }

            // Check if type is implemented and valid
            const typeCheck = (variables.voucherTypes).split(';').includes(req.body.type);
            if(!typeCheck) {
                res.status(400).json({
                    error: 'Unknown Type!',
                    data: {}
                });
                return;
            }

            // Prepare optional note (sanitize to avoid breaking internal separator format)
            let noteInput = '';
            if(typeof req.body.note !== 'undefined' && req.body.note !== null) {
                if(typeof req.body.note !== 'string') {
                    res.status(400).json({
                        error: 'Invalid Note!',
                        data: {}
                    });
                    return;
                }
                noteInput = req.body.note;

            }

            // Build the note string expected by utils/notes.js
            const finalNote = `${noteInput}||;;||api||;;||local||;;||`;

            // Create voucher code
            const voucherCode = await unifi.create(types(req.body.type, true), 1, finalNote).catch((e) => {
                res.status(500).json({
                    error: e,
                    data: {}
                });
            });

            // Update application cache
            await updateCache();

            if(voucherCode) {
                // Locate voucher data within cache
                const voucherData = cache.vouchers.find(voucher => voucher.code === voucherCode.replaceAll('-', ''));
                if(!voucherData) {
                    res.status(500).json({
                        error: 'Invalid application cache!',
                        data: {}
                    });
                    return;
                }

                // Check if we should send and email
                if(req.body.email) {
                    // Send mail
                    const emailResult = await mail.send(req.body.email.address, voucherData, req.body.email.language).catch((e) => {
                        res.status(500).json({
                            error: e,
                            data: {}
                        });
                    });

                    // Verify is the email was sent successfully
                    if(emailResult) {
                        res.json({
                            error: null,
                            data: {
                                message: 'OK',
                                voucher: {
                                    id: voucherData.id,
                                    code: voucherCode
                                },
                                email: {
                                    status: 'SENT',
                                    address: req.body.email.address
                                }
                            }
                        });
                    }
                } else {
                    res.json({
                        error: null,
                        data: {
                            message: 'OK',
                            voucher: {
                                id: voucherData.id,
                                code: voucherCode
                            }
                        }
                    });
                }
            }
        }
    }
};

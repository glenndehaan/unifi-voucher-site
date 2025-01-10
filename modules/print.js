/**
 * Import base packages
 */
const PDFDocument = require('pdfkit');
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

/**
 * Import own modules
 */
const variables = require('./variables');
const log = require('./log');
const qr = require('./qr');
const translation = require('./translation');

/**
 * Import own utils
 */
const time = require('../utils/time');
const bytes = require('../utils/bytes');
const size = require('../utils/size');

/**
 * Exports the printer module
 */
module.exports = {
    /**
     * Generates a voucher as a PDF
     *
     * @param content
     * @param language
     * @param multiPage
     * @return {Promise<unknown>}
     */
    pdf: (content, language, multiPage= false) => {
        return new Promise(async (resolve) => {
            // Create new translator
            const t = translation('print', language);

            // Set vouchers based on multiPage parameter
            let vouchers = [];
            if(multiPage) {
                vouchers = [...content];
            } else {
                vouchers = [content];
            }

            const doc = new PDFDocument({
                bufferPages: true,
                size: [226.77165354330398, size(vouchers[0])],
                margins : {
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 20
                }
            });

            // Utilize custom font for custom characters
            doc.font(__dirname + '/../public/fonts/Roboto-Regular.ttf');
            doc.font(__dirname + '/../public/fonts/Roboto-Bold.ttf');

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                log.info('[Printer] PDF generation completed!');
                resolve(buffers);
            });

            for(let item = 0; item < vouchers.length; item++) {
                if(item > 0) {
                    doc.addPage({
                        size: [226.77165354330398, size(vouchers[item])],
                        margins : {
                            top: 20,
                            bottom: 20,
                            left: 20,
                            right: 20
                        }
                    });

                    doc.moveDown(1);
                }

                doc.image('public/images/logo_grayscale_dark.png', 75, 15, {
                    fit: [75, 75],
                    align: 'center',
                    valign: 'center'
                });
                doc.moveDown(6);

                doc.font('Roboto-Bold')
                    .fontSize(20)
                    .text(`${t('title')}`, {
                        align: 'center'
                    });
                doc.font('Roboto-Bold')
                    .fontSize(15)
                    .text(`${vouchers[item].code.slice(0, 5)}-${vouchers[item].code.slice(5)}`, {
                        align: 'center'
                    });

                doc.moveDown(2);

                if (variables.unifiSsid !== '') {
                    doc.font('Roboto-Regular')
                        .fontSize(10)
                        .text(`${t('connect')}: `, {
                            continued: true
                        });
                    doc.font('Roboto-Bold')
                        .fontSize(10)
                        .text(variables.unifiSsid, {
                            continued: true
                        });

                    if (variables.unifiSsidPassword !== '') {
                        doc.font('Roboto-Regular')
                            .fontSize(10)
                            .text(`,`);
                        doc.font('Roboto-Regular')
                            .fontSize(10)
                            .text(`${t('password')}: `, {
                                continued: true
                            });
                        doc.font('Roboto-Bold')
                            .fontSize(10)
                            .text(variables.unifiSsidPassword, {
                                continued: true
                            });
                        doc.font('Roboto-Regular')
                            .fontSize(10)
                            .text(` ${t('or')},`);
                    } else {
                        doc.font('Roboto-Regular')
                            .fontSize(10)
                            .text(` ${t('or')},`);
                    }

                    doc.font('Roboto-Regular')
                        .fontSize(10)
                        .text(`${t('scan')}:`);

                    doc.image(await qr(), 75, variables.unifiSsidPassword !== '' ? 215 : 205, {
                        fit: [75, 75],
                        align: 'center',
                        valign: 'center'
                    });
                    doc.moveDown(6);

                    doc.moveDown(2);
                }

                doc.font('Roboto-Bold')
                    .fontSize(12)
                    .text(`${t('details')}`);

                doc.font('Roboto-Bold')
                    .fontSize(10)
                    .text(`------------------------------------------`);

                doc.font('Roboto-Bold')
                    .fontSize(10)
                    .text(`${t('type')}: `, {
                        continued: true
                    });
                doc.font('Roboto-Regular')
                    .fontSize(10)
                    .text(vouchers[item].quota === 1 ? t('singleUse') : vouchers[item].quota === 0 ? t('multiUse') : t('multiUse'));

                doc.font('Roboto-Bold')
                    .fontSize(10)
                    .text(`${t('duration')}: `, {
                        continued: true
                    });
                doc.font('Roboto-Regular')
                    .fontSize(10)
                    .text(time(vouchers[item].duration));

                if (vouchers[item].qos_usage_quota) {
                    doc.font('Roboto-Bold')
                        .fontSize(10)
                        .text(`${t('dataLimit')}: `, {
                            continued: true
                        });
                    doc.font('Roboto-Regular')
                        .fontSize(10)
                        .text(`${bytes(vouchers[item].qos_usage_quota, 2)}`);
                }

                if (vouchers[item].qos_rate_max_down) {
                    doc.font('Roboto-Bold')
                        .fontSize(10)
                        .text(`${t('downloadLimit')}: `, {
                            continued: true
                        });
                    doc.font('Roboto-Regular')
                        .fontSize(10)
                        .text(`${bytes(vouchers[item].qos_rate_max_down, 1, true)}`);
                }

                if (vouchers[item].qos_rate_max_up) {
                    doc.font('Roboto-Bold')
                        .fontSize(10)
                        .text(`${t('uploadLimit')}: `, {
                            continued: true
                        });
                    doc.font('Roboto-Regular')
                        .fontSize(10)
                        .text(`${bytes(vouchers[item].qos_rate_max_up, 1, true)}`);
                }
            }

            doc.end();
        });
    },

    /**
     * Sends a print job to an ESC/POS compatible network printer
     *
     * @param voucher
     * @param language
     * @return {Promise<unknown>}
     */
    escpos: (voucher, language) => {
        return new Promise(async (resolve, reject) => {
            // Create new translator
            const t = translation('print', language);

            const printer = new ThermalPrinter({
                type: PrinterTypes.EPSON,
                interface: `tcp://${variables.printerIp}`
            });

            const status = await printer.isPrinterConnected();

            if(!status) {
                reject('Unable to connect to printer!');
                return;
            }

            printer.setTypeFontB();
            printer.alignCenter();
            printer.newLine();
            await printer.printImage(`${process.cwd()}/public/images/logo_grayscale_dark.png`);
            printer.newLine();

            printer.alignCenter();
            printer.newLine();
            printer.setTextSize(2, 2);
            printer.println(`${t('title')}`);
            printer.setTextSize(1, 1);
            printer.println(`${voucher.code.slice(0, 5)}-${voucher.code.slice(5)}`);
            printer.setTextNormal();

            if(variables.unifiSsid) {
                printer.newLine();
                printer.newLine();
                printer.newLine();

                printer.alignLeft();
                printer.print(`${t('connect')}: `);
                printer.setTypeFontB();
                printer.setTextSize(1, 1);
                printer.print(variables.unifiSsid);
                printer.setTextNormal();
                if(variables.unifiSsidPassword) {
                    printer.print(',');
                    printer.newLine();
                    printer.print(`${t('password')}: `);
                    printer.setTypeFontB();
                    printer.setTextSize(1, 1);
                    printer.print(variables.unifiSsidPassword);
                    printer.setTextNormal();
                    printer.print(` ${t('or')},`);
                    printer.newLine();
                } else {
                    printer.print(` ${t('or')},`);
                    printer.newLine();
                }
                printer.println(`${t('scan')}:`);
                printer.alignCenter();
                await printer.printImageBuffer(await qr(true));
            }

            printer.newLine();
            printer.newLine();

            printer.alignLeft();
            printer.setTypeFontB();
            printer.setTextSize(1, 1);
            printer.println(`${t('details')}`);
            printer.setTextNormal();
            printer.drawLine();

            printer.setTextDoubleHeight();
            printer.invert(true);
            printer.print(`${t('type')}:`);
            printer.invert(false);
            printer.print(voucher.quota === 1 ? ` ${t('singleUse')}` : voucher.quota === 0 ? ` ${t('multiUse')}` : ` ${t('multiUse')}`);
            printer.newLine();

            printer.setTextDoubleHeight();
            printer.invert(true);
            printer.print(`${t('duration')}:`);
            printer.invert(false);
            printer.print(` ${time(voucher.duration)}`);
            printer.newLine();

            if(voucher.qos_usage_quota) {
                printer.setTextDoubleHeight();
                printer.invert(true);
                printer.print(`${t('dataLimit')}:`);
                printer.invert(false);
                printer.print(` ${bytes(voucher.qos_usage_quota, 2)}`);
                printer.newLine();
            }

            if(voucher.qos_rate_max_down) {
                printer.setTextDoubleHeight();
                printer.invert(true);
                printer.print(`${t('downloadLimit')}:`);
                printer.invert(false);
                printer.print(` ${bytes(voucher.qos_rate_max_down, 1, true)}`);
                printer.newLine();
            }

            if(voucher.qos_rate_max_up) {
                printer.setTextDoubleHeight();
                printer.invert(true);
                printer.print(`${t('uploadLimit')}:`);
                printer.invert(false);
                printer.print(` ${bytes(voucher.qos_rate_max_up, 1, true)}`);
                printer.newLine();
            }

            printer.newLine();
            printer.newLine();
            printer.newLine();
            printer.newLine();
            printer.cut();
            printer.beep(2, 2);

            try {
                await printer.execute();
                log.info('[Printer] Data send to printer!');

                // Ensure cheap printers have cleared the buffer before allowing new actions
                setTimeout(() => {
                    resolve(true);
                }, 1500);
            } catch (error) {
                reject(error);
            }
        });
    }
};

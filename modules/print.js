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
     * @param voucher
     * @return {Promise<unknown>}
     */
    pdf: (voucher) => {
        return new Promise((resolve) => {
            const doc = new PDFDocument({
                bufferPages: true,
                size: [226.77165354330398, size(voucher)],
                margins : {
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 20
                }
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                log.info('[Printer] PDF generation completed!');
                resolve(buffers);
            });

            doc.image('public/images/logo_grayscale_dark.png', 75, 15, {fit: [75, 75], align: 'center', valign: 'center'});

            doc.moveDown(6);

            doc.font('Helvetica-Bold')
                .fontSize(20)
                .text(`WiFi Voucher Code`, {
                    align: 'center'
                });
            doc.font('Helvetica-Bold')
                .fontSize(15)
                .text(`${voucher.code.slice(0, 5)}-${voucher.code.slice(5)}`, {
                    align: 'center'
                });

            doc.moveDown(2);

            doc.font('Helvetica-Bold')
                .fontSize(12)
                .text(`Voucher Details`);

            doc.font('Helvetica-Bold')
                .fontSize(10)
                .text(`--------------------------------------------------------`);

            doc.font('Helvetica-Bold')
                .fontSize(10)
                .text(`Type: `, {
                    continued: true
                });
            doc.font('Helvetica')
                .fontSize(10)
                .text(voucher.quota === 0 ? 'Multi-use' : 'Single-use');

            doc.font('Helvetica-Bold')
                .fontSize(10)
                .text(`Duration: `, {
                    continued: true
                });
            doc.font('Helvetica')
                .fontSize(10)
                .text(time(voucher.duration));

            if(voucher.qos_usage_quota) {
                doc.font('Helvetica-Bold')
                    .fontSize(10)
                    .text(`Data Limit: `, {
                        continued: true
                    });
                doc.font('Helvetica')
                    .fontSize(10)
                    .text(`${bytes(voucher.qos_usage_quota, 2)}`);
            }

            if(voucher.qos_rate_max_down) {
                doc.font('Helvetica-Bold')
                    .fontSize(10)
                    .text(`Download Limit: `, {
                        continued: true
                    });
                doc.font('Helvetica')
                    .fontSize(10)
                    .text(`${bytes(voucher.qos_rate_max_down, 1, true)}`);
            }

            if(voucher.qos_rate_max_up) {
                doc.font('Helvetica-Bold')
                    .fontSize(10)
                    .text(`Upload Limit: `, {
                        continued: true
                    });
                doc.font('Helvetica')
                    .fontSize(10)
                    .text(`${bytes(voucher.qos_rate_max_up, 1, true)}`);
            }

            doc.end();
        });
    },

    /**
     * Sends a print job to an ESC/POS compatible network printer
     *
     * @param voucher
     * @return {Promise<unknown>}
     */
    escpos: (voucher) => {
        return new Promise(async (resolve, reject) => {
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
            printer.println('WiFi Voucher Code');
            printer.setTextSize(1, 1);
            printer.println(`${voucher.code.slice(0, 5)}-${voucher.code.slice(5)}`);
            printer.setTextNormal();

            printer.newLine();
            printer.newLine();
            printer.newLine();
            printer.newLine();
            printer.newLine();

            printer.alignLeft();
            printer.setTypeFontB();
            printer.setTextSize(1, 1);
            printer.println('Voucher Details');
            printer.setTextNormal();
            printer.drawLine();

            printer.setTextDoubleHeight();
            printer.invert(true);
            printer.print('Type:');
            printer.invert(false);
            printer.print(voucher.quota === 0 ? ' Multi-use' : ' Single-use');
            printer.newLine();

            printer.setTextDoubleHeight();
            printer.invert(true);
            printer.print('Duration:');
            printer.invert(false);
            printer.print(` ${time(voucher.duration)}`);
            printer.newLine();

            if(voucher.qos_usage_quota) {
                printer.setTextDoubleHeight();
                printer.invert(true);
                printer.print('Data Limit:');
                printer.invert(false);
                printer.print(` ${bytes(voucher.qos_usage_quota, 2)}`);
                printer.newLine();
            }

            if(voucher.qos_rate_max_down) {
                printer.setTextDoubleHeight();
                printer.invert(true);
                printer.print('Download Limit:');
                printer.invert(false);
                printer.print(` ${bytes(voucher.qos_rate_max_down, 1, true)}`);
                printer.newLine();
            }

            if(voucher.qos_rate_max_up) {
                printer.setTextDoubleHeight();
                printer.invert(true);
                printer.print('Upload Limit:');
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
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }
};

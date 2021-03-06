/**
 * Import vendor packages
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Import own packages
 */
const config = require('../config/config');
const unifi = require('./UniFi');

/**
 * Socket
 */
class Socket {
    /**
     * Constructor
     *
     * @param server
     */
    constructor(server) {
        this.io = require('socket.io')(server);
        this.authenticatedUsers = [];

        this.init();

        // Cleanup after 30 minutes
        setInterval(() => this.cleanup(), 30 * 60 * 1000);
    }

    /**
     * Init the socket connection
     */
    init() {
        this.io.on('connection', (socket) => {
            /**
             * Triggered when a socket disconnects
             */
            socket.on('disconnect', () => {
                console.log(`[SOCKET] Client disconnected! ID: ${socket.id}`);
            });

            /**
             * Client requests a uuid
             */
            socket.on('uuid', () => {
                const uuid = uuidv4();
                this.authenticatedUsers[uuid] = false;

                socket.emit('uuid', {
                    uuid: uuid
                });
                console.log(`[SOCKET][${socket.id}] Client requested a UUID! UUID: ${uuid}`);
            });

            /**
             * Client auth check
             */
            socket.on('auth', (data) => {
                if(typeof this.authenticatedUsers[data.uuid] !== "undefined") {
                    if(config.security.code === data.code) {
                        this.authenticatedUsers[data.uuid] = true;
                        socket.emit('auth', {
                            success: true
                        });

                        console.log(`[SOCKET][${socket.id}] Client auth: OK`);
                    } else {
                        socket.emit('auth', {
                            success: false
                        });

                        console.log(`[SOCKET][${socket.id}] Client auth: FAILED. Invalid code!`);
                    }
                } else {
                    socket.emit('auth', {
                        success: false
                    });

                    console.log(`[SOCKET][${socket.id}] Client auth: FAILED. Invalid UUID!`);
                }
            });

            /**
             * Create voucher method
             */
            socket.on('voucher', (data) => {
                if(typeof this.authenticatedUsers[data.uuid] !== "undefined") {
                    if(this.authenticatedUsers[data.uuid]) {
                        unifi((voucher) => {
                            if(voucher !== false) {
                                socket.emit('voucher', {
                                    success: true,
                                    voucher: voucher
                                });

                                console.log(`[SOCKET][${socket.id}] Client voucher: OK. Voucher: ${voucher}!`);
                            } else {
                                socket.emit('voucher', {
                                    success: false,
                                    voucher: ''
                                });

                                console.log(`[SOCKET][${socket.id}] Client voucher: FAILED. UniFi Error!`);
                            }
                        });
                    } else {
                        socket.emit('voucher', {
                            success: false,
                            voucher: ''
                        });

                        console.log(`[SOCKET][${socket.id}] Client voucher: FAILED. Not authenticated!`);
                    }
                } else {
                    socket.emit('voucher', {
                        success: false,
                        voucher: ''
                    });

                    console.log(`[SOCKET][${socket.id}] Client voucher: FAILED. Invalid UUID!`);
                }
            });

            console.log(`[SOCKET] New client connected! ID: ${socket.id}`);
        });

        /**
         * Start listening on the right port/host for the Socket.IO server
         */
        console.log('[SYSTEM] Socket.IO started !');
    }

    /**
     * Clear the authenticated users after 30 minutes
     */
    cleanup() {
        this.authenticatedUsers = [];
        console.log('[SYSTEM] Cleanup authenticatedUsers complete!');
    }
}

/**
 * Export the socket class
 *
 * @type {Socket}
 */
module.exports = Socket;

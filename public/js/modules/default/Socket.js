import io from 'socket.io-client';

class Socket {
    constructor({el}) {
        this.el = el;
        this.socket = false;

        this.init();
    }

    init() {
        this.socket = io.connect(`http://${expressConfig.hostname}:${expressConfig.port}`);

        this.socket.on('connect', this.connect);
        this.socket.on('disconnect', this.disconnect);
        this.socket.on('error', this.error);
    }

    connect() {
        console.log('[SOCKET] Connected!');
    }

    disconnect() {
        console.log('[SOCKET] Disconnected!');
    }

    error() {
        console.log('[SOCKET] Error!');
    }
}

module.exports = Socket;

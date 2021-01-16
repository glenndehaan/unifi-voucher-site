import io from 'socket.io-client';
import animejs from 'animejs';

export default class Socket {
    constructor({el}) {
        this.el = el;
        this.socket = false;
        this.uuid = false;
        this.userSignedIn = false;

        this.mainContainer = document.querySelector("#container");
        this.signInContainer = document.querySelector("#sign-in");
        this.voucherContainer = document.querySelector("#voucher");
        this.errorContainer = document.querySelector("#error");
        this.preloader = document.querySelector("#preloader");

        document.querySelector("#voucher button").addEventListener("click", () => this.requestVoucher());

        this.init();
    }

    /**
     * Start the socket connection
     */
    init() {
        this.socket = io.connect(`//${expressConfig.hostname}`);

        this.socket.on('connect', () => this.connect());
        this.socket.on('disconnect', () => this.disconnect());
        this.socket.on('error', () => this.error());

        this.socket.on('uuid', (data) => this.setUuid(data));
        this.socket.on('auth', (data) => this.auth(data));
        this.socket.on('voucher', (data) => this.voucher(data));
    }

    /**
     * Event when the socket is connected
     */
    connect() {
        console.log('[SOCKET] Connected!');

        if (!this.uuid) {
            console.log('[SOCKET] Requesting UUID!');
            this.socket.emit('uuid');
        }

        animejs({
            targets: this.mainContainer,
            duration: 250,
            opacity: [1, 0],
            easing: 'linear',
            complete: () => {
                if (!this.userSignedIn) {
                    this.signInContainer.classList.remove("hidden");
                } else {
                    this.voucherContainer.classList.remove("hidden");
                }

                this.errorContainer.classList.add("hidden");

                animejs({
                    targets: this.mainContainer,
                    duration: 250,
                    opacity: [0, 1],
                    easing: 'linear',
                });
            }
        });
    }

    /**
     * Event when the socket disconnects
     */
    disconnect() {
        console.log('[SOCKET] Disconnected!');

        animejs({
            targets: this.mainContainer,
            duration: 250,
            opacity: [1, 0],
            easing: 'linear',
            complete: () => {
                this.signInContainer.classList.add("hidden");
                this.voucherContainer.classList.add("hidden");
                this.errorContainer.classList.remove("hidden");

                animejs({
                    targets: this.mainContainer,
                    duration: 250,
                    opacity: [0, 1],
                    easing: 'linear'
                });
            }
        });
    }

    /**
     * Event when the socket error's
     */
    error() {
        console.log('[SOCKET] Error!');

        animejs({
            targets: this.mainContainer,
            duration: 250,
            opacity: [1, 0],
            easing: 'linear',
            complete: () => {
                this.signInContainer.classList.add("hidden");
                this.voucherContainer.classList.add("hidden");
                this.errorContainer.classList.remove("hidden");

                animejs({
                    targets: this.mainContainer,
                    duration: 250,
                    opacity: [0, 1],
                    easing: 'linear'
                });
            }
        });
    }

    /**
     * Event for getting the UUID
     */
    setUuid(data) {
        this.uuid = data.uuid;
    }

    /**
     * Event for getting the auth result
     */
    auth(data) {
        if (data.success) {
            this.userSignedIn = true;

            animejs({
                targets: this.mainContainer,
                duration: 250,
                opacity: [1, 0],
                easing: 'linear',
                complete: () => {
                    site.modules.Signin.resetForm();
                    this.signInContainer.classList.add("hidden");
                    this.voucherContainer.classList.remove("hidden");

                    animejs({
                        targets: this.mainContainer,
                        duration: 250,
                        opacity: [0, 1],
                        easing: 'linear'
                    });
                }
            });
        } else {
            site.modules.Signin.invalidCode();
        }
    }

    /**
     * Request a guest voucher
     */
    requestVoucher() {
        if (this.userSignedIn) {
            this.preloader.classList.remove("completed");

            this.socket.emit('voucher', {
                uuid: this.uuid
            });
        }
    }

    /**
     * Process the voucher
     *
     * @param data
     */
    voucher(data) {
        this.preloader.classList.add("completed");
        if (data.success) {
            this.voucherContainer.querySelector("h4").innerHTML = data.voucher;
        }
    }
}

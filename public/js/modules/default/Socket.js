import io from 'socket.io-client';

export default class Socket {
    constructor({el}) {
        this.el = el;
        this.socket = false;
        this.uuid = false;
        this.userSignedIn = false;

        this.mainContainer = document.querySelector("#container");
        this.signInContainer = document.querySelector("#sign-in");
        this.errorContainer = document.querySelector("#error");

        this.tl = new TimelineMax();

        this.init();
    }

    /**
     * Start the socket connection
     */
    init() {
        this.socket = io.connect(`http://${expressConfig.hostname}:${expressConfig.port}`);

        this.socket.on('connect', () => this.connect());
        this.socket.on('disconnect', () => this.disconnect());
        this.socket.on('error', () => this.error());

        this.socket.on('uuid', (data) => this.setUuid(data));
        this.socket.on('auth', (data) => this.auth(data));
    }

    /**
     * Event when the socket is connected
     */
    connect() {
        console.log('[SOCKET] Connected!');

        if(!this.uuid) {
            console.log('[SOCKET] Requesting UUID!');
            this.socket.emit('uuid');
        }

        this.tl
            .to(this.mainContainer, 0.5, {
                opacity: 0,
                display: "none"
            })
            .add(() => {
                if(!this.userSignedIn) {
                    this.signInContainer.classList.remove("hidden");
                }
                this.errorContainer.classList.add("hidden");
            })
            .to(this.mainContainer, 0.5, {
                opacity: 1,
                display: "block"
            });
    }

    /**
     * Event when the socket disconnects
     */
    disconnect() {
        console.log('[SOCKET] Disconnected!');

        this.tl
            .to(this.mainContainer, 0.5, {
                opacity: 0,
                display: "none"
            })
            .add(() => {
                this.signInContainer.classList.add("hidden");
                this.errorContainer.classList.remove("hidden");
            })
            .to(this.mainContainer, 0.5, {
                opacity: 1,
                display: "block"
            });
    }

    /**
     * Event when the socket error's
     */
    error() {
        console.log('[SOCKET] Error!');

        this.tl
            .to(this.mainContainer, 0.5, {
                opacity: 0,
                display: "none"
            })
            .add(() => {
                this.signInContainer.classList.add("hidden");
                this.errorContainer.classList.remove("hidden");
            })
            .to(this.mainContainer, 0.5, {
                opacity: 1,
                display: "block"
            });
    }

    /**
     * Event for getting the UUID
     */
    setUuid(data) {
        this.uuid = data.uuid;
        console.log('this.uuid', this.uuid);
    }

    /**
     * Event for getting the auth result
     */
    auth(data) {
        if(data.success) {
            this.userSignedIn = true;

            this.tl
                .to(this.mainContainer, 0.5, {
                    opacity: 0,
                    display: "none"
                })
                .add(() => {
                    this.signInContainer.classList.add("hidden");
                })
                .to(this.mainContainer, 0.5, {
                    opacity: 1,
                    display: "block"
                });
        } else {
            site.modules.Signin.invalidCode();
        }
    }
}

import "particles.js";

export default class Particles {
    constructor({el}) {
        this.el = el;

        this.init();
        this.preloader = document.querySelector("#preloader");
    }

    init() {
        window.particlesJS.load('particles', "/json/particles.json", () => {
            console.log('particles.js Loaded!');
            this.preloader.classList.add("completed");
        });
    }
}

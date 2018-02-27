export default class Signin {
    constructor({el}) {
        this.el = el;

        this.fields = document.querySelectorAll(".access-fields");
        for(let field = 0; field < this.fields.length; field++) {
            this.fields[field].addEventListener("keyup", () => this.moveOnMax(this.fields[field], field));
        }

        this.fields[0].addEventListener("keydown", () => this.removeError());
    }

    /**
     * Move focus to next field
     *
     * @param field
     * @param currentId
     */
    moveOnMax(field, currentId) {
        if (field.value.length === 1) {
            if(currentId < (this.fields.length - 1)) {
                const nextField = currentId + 1;
                this.fields[nextField].focus();
            } else {
                this.validate();
            }
        }
    }

    /**
     * Check if the code is correct
     */
    validate() {
        site.modules.Socket.socket.emit('auth', {
            uuid: site.modules.Socket.uuid,
            code: `${this.fields[0].value}${this.fields[1].value}${this.fields[2].value}${this.fields[3].value}`
        });
    }

    /**
     * Remove the error state from the inputs
     */
    removeError() {
        for(let field = 0; field < this.fields.length; field++) {
            this.fields[field].classList.remove("error");
        }
    }

    /**
     * Add the invalid state to the inputs
     */
    invalidCode() {
        this.fields[0].focus();

        for(let field = 0; field < this.fields.length; field++) {
            this.fields[field].classList.add("error");
            this.fields[field].value = "";
        }
    }
}

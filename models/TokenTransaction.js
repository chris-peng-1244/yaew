class TokenTransaction {
    constructor(tx, token) {
        this.getTransaction = () => { return tx; };
        this.getToken = () => { return token; };
    }

    getToAddress() {
        return '0x' + this.getTransaction().input.substr(34, 40);
    }

    getValue() {
        return parseInt(this.getTransaction().input.substr(74), 16) / Math.pow(10, this.getToken().getDecimal());
    }

    getFromAddress() {
        return this.getTransaction().from;
    }

    getHash() {
        return this.getTransaction().hash;
    }
}

module.exports = TokenTransaction;
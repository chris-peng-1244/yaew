const userWallet = require('./UserWallet');

class Receipt {
    constructor({
        hash,
        from,
        to,
        value,
        type
    }) {
        this.getHash = () => {
            return hash;
        };
        this.getFromAddress = () => {
            return from;
        };
        this.getToAddress = () => {
            return to;
        };
        this.getValue = () => {
            return value;
        };
        this.getType = () => {
            return type;
        };
    }
}

class Cashier {

    async audit(tx) {
        throw new Error("This should be implemented");
    }

    async _callback(receipt) {
        throw new Error("This should be implemented");
    }
}

class EthCashier extends Cashier {

    async audit(tx) {
        if ((await userWallet.isValidUserWallet(tx.to)) &&
            !userWallet.isCoinbase(tx.from)) {
            const receipt = new Receipt({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                type: Token.ETH,
            });
            return await this._callback(receipt);
        }
        return false;
    }

    async _callback(receipt) {
        console.log(`Callback to xxx of transaction ${receipt.getHash()}: ${receipt.getValue()} ETH --->${receipt.getToAddress()}`);
        return true;
    }
}

class TokenCashier extends Cashier {
    constructor(token) {
        super();
        this.getToken = () => {
            return token;
        };
    }

    async audit(tx) {
        const toAddress = tx.to.toLowerCase();
        if (!userWallet.isCoinbase(tx.from) &&
            toAddress == this.getToken().getAddress()) {
            const tokenTransaction = new TokenTransaction(tx);
            if (!(await userWallet.isValidUserWallet(tokenTransaction.getToAddress()))) {
                return false;
            }
            return await this._callback(new Receipt({
                hash: tx.hash,
                from: tx.from,
                to: tokenTransaction.getToAddress(),
                value: tokenTransaction.getValue(),
                type: this.getToken().getType(),
            }));
        }
        return false;
    }

    async _callback(receipt) {
        console.log(`Callback to xxx of transaction ${receipt.getHash()}: ${receipt.getValue()} TOKEN --->${receipt.getToAddress()}`);
    }
}

exports.createEthCashier = function createEthCashier() {
    return new EthCashier();
};

exports.createTokenCashier = function createTokenCashier(token) {
    return new TokenCashier(token);
};
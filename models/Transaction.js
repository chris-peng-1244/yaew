const Token = require('./Token');
exports.createTransaction= (from, to, token, gasPrice, nonce) => {
    if (token.getType() == Token.ETH) {
        return new EthTransaction(from, to, token, gasPrice, nonce);
    }
    return new TokenTransaction(from, to, token, gasPrice, nonce);
};

class Transaction {
    constructor(from, to, token, gasPrice, nonce) {
        this.from = from;
        this.to = to;
        this.token = token;
        this.gasPrice = gasPrice;
        this.nonce = nonce;
    }

    getTxObj() {
        let tx = this.getTx();
        if (this.gasPrice > 0) {
            tx.gasPrice = this.gasPrice;
        }
        if (this.nonce > 0) {
            tx.nonce = this.nonce;
        }
        return tx;
    }

    getTx() {
        throw new Error("This method should be implemented");
    }
}

class EthTransaction extends Transaction {
    getTx() {
        return {
            to: this.to,
            value: this.token.getAmount(),
            gas: 42000,
        };
    }
}

class TokenTransaction extends Transaction {
    getTx() {
        return {
            to: this.token.getAddress(),
            value: 0,
            data: this.getTokenTransactionData(this.to, this.token.getAmount()),
            gas: 100000,
        };
    }

    getTokenTransactionData(to, amount) {
        return '0xa9059cbb' + to.substr(2).padStart(64, '0')
            + parseInt(amount).toString(16).padStart(64, '0');
    }
}
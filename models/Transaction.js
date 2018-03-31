const Token = require('./Token');
exports.createTransaction= (from, to, token, gasPrice) => {
    if (token.getType() == Token.ETH) {
        return new EthTransaction(from, to, token, gasPrice);
    }
    return new TokenTransaction(from, to, token, gasPrice);
};

class Transaction {
    constructor(from, to, token, gasPrice) {
        this.from = from;
        this.to = to;
        this.token = token;
        this.gasPrice = gasPrice;
    }

    getTxObj() {
        throw new Error("This method should be implemented");
    }
}

class EthTransaction extends Transaction {
    getTxObj() {
        const tx = {
            to: this.to,
            value: this.token.getAmount(),
            gas: 42000,
        };
        if (this.gasPrice > 0) {
            tx.gasPrice = this.gasPrice;
        }
        return tx;
    }
}

class TokenTransaction extends Transaction {
    getTxObj() {
        let tx = {
            to: this.token.getAddress(),
            value: 0,
            data: this.getTokenTransactionData(this.to, this.token.getAmount()),
            gas: 100000,
        };
        if (this.gasPrice > 0) {
            tx.gasPrice = this.gasPrice;
        }
        return tx;
    }

    getTokenTransactionData(to, amount) {
        return '0xa9059cbb' + to.substr(2).padStart(64, '0')
            + parseInt(amount).toString(16).padStart(64, '0');
    }
}
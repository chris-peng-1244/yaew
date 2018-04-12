const Token = require('./Token');
const redis = require('../utils/Redis');
const timer = require('../utils/Timer');
const web3 = require('../utils/Web3');
const Nonce = require('../models/Nonce');

/**
 * This module is aim to create tx object based on what token you want to transfer
 * @param {String} from 
 * @param {String} to 
 * @param {Token} token 
 * @param {integer} gasPrice 
 * @param {boolean} manageNonce Should I get nonce by calling getBlockNumber() or read from redis?
 */
exports.createTransaction= (from, to, token, gasPrice, manageNonce) => {
    if (token.getType() == Token.ETH) {
        return new EthTransaction(from, to, token, gasPrice, manageNonce);
    }
    return new TokenTransaction(from, to, token, gasPrice, manageNonce);
};

class Transaction {
    constructor(from, to, token, gasPrice, manageNonce) {
        this.from = from;
        this.to = to;
        this.token = token;
        this.gasPrice = gasPrice;
        this.manageNonce = manageNonce;
    }

    /**
     * @throws when we can't decide the nonce of this transaction
     */
    async getTxObj() {
        let tx = this.getTx();
        if (this.manageNonce) {
            tx.nonce = await this.getNonce();
        }
        if (this.gasPrice > 0) {
            tx.gasPrice = this.gasPrice;
        }
        return tx;
    }

    async getNonce() {
        return await Nonce.of(this.from).get();
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
            gas: 21000,
        };
    }
}

class TokenTransaction extends Transaction {
    getTx() {
        return {
            to: this.token.getAddress(),
            value: 0,
            data: this.getTokenTransactionData(this.to, this.token.getAmount()),
            gas: 60000,
        };
    }

    /**
     * Create transaction call data in the form of
     * transfer(to, amount) 
     * 
     * @param {String} to 
     * @param {String} amount 
     */
    getTokenTransactionData(to, amount) {
        return '0xa9059cbb' + to.substr(2).padStart(64, '0')
            + parseInt(amount).toString(16).padStart(64, '0');
    }
}
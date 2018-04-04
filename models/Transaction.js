const Token = require('./Token');
const redis = require('../utils/Redis');
const timer = require('../utils/Timer');
const web3 = require('../utils/Web3');
const NONCE_LOCK = process.env.APP_NAME+'_nonce_lock_';
const NONCE = process.env.APP_NAME+'_nonce_';

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

    /**
     * @throws when we can't decide the nonce of this transaction
     */
    async getTxObj() {
        let tx = this.getTx();
        tx.nonce = await this.getNonce();
        if (this.gasPrice > 0) {
            tx.gasPrice = this.gasPrice;
        }
        return tx;
    }

    async getNonce() {
        const maxWait = 10;
        let wait = 0;
        let nonce = -1;
        while (wait++ < maxWait) {
            // Lock this address
            const isFree = await redis.setnxAsync(NONCE_LOCK + this.from, 1);
            if (isFree == 0) {
                await timer.setTimeout(20);
                continue;
            }
            nonce = await redis.incrAsync(NONCE + this.from);
            const nonceOnEth = await web3.eth.getTransactionCount(this.from);
            // If the nonce is less than the transactions mined on Ethereum,
            // something is wrong, reset nonce value.
            if (nonce < nonceOnEth) {
                nonce = nonceOnEth;
                await redis.setAsync(NONCE + this.from, nonce);
            }
            // Unlock this address
            await redis.delAsync(NONCE_LOCK + this.from);
            break;
        }
        if (nonce < 0) {
            throw new Error("Can't get the nonce of " + this.from); 
        }
        return nonce;
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
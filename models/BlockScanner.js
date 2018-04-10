const redis =  require('../utils/Redis');
const web3 = require('../utils/Web3');
const Promise = require('bluebird');
require('colors');
const Cashier = require('../models/Cashier');
const Token = require('../models/Token');

const LAST_SCANNED_BLOCK_NUMBER = process.env.APP_NAME + '_last_scanned_block_number';
const FAILED_TRANSACTION_KEY = process.env.APP_NAME + '_failed_scanning_tx_hashes';
const FAILED_BLOCK_NUMBER = process.env.APP_NAME + '_failed_block_numbers';

class BlockScanner {
    async init() {
        const cashiers = [
            Cashier.createEthCashier(),            
            Cashier.createTokenCashier(await Token.create(Token.MYTOKEN)),            
        ];
        this.getCashiers = () => { return cashiers; };
    }

    async getLastScannedBlockNumber(baseNumber) {
        let lastNumber = await redis.getAsync(LAST_SCANNED_BLOCK_NUMBER);
        if (null === lastNumber) {
            lastNumber = baseNumber > 1000 ? baseNumber - 1000 : -1;  
            await redis.setAsync(LAST_SCANNED_BLOCK_NUMBER, lastNumber);
        }
        return parseInt(lastNumber);
    }

    async scan(blockNumber) {
        try {
            const block = await web3.eth.getBlock(blockNumber);
            await scanTransactions(block.transactions, this.getCashiers());
            return true;
        } catch (e) {
            console.error(`Can't get block ${blockNumber}` + e);
            await redis.lpush(FAILED_BLOCK_NUMBER, blockNumber);
            return false;
        } finally {
            await redis.setAsync(LAST_SCANNED_BLOCK_NUMBER, blockNumber);
        }
    }
}

async function scanTransactions(transactions, cashiers) {
    const pageSize = 20;
    const page = Math.ceil(transactions.length / pageSize);
    for (let i = 0; i < page; i++) {
        let promises = [];
        let transactionSlice = transactions.slice(i*pageSize, (i+1)*pageSize);
        transactionSlice.forEach(tx => {
            promises.push(scanTransaction(tx, cashiers));
        });
        try {
            await Promise.all(promises)
        } catch (e) {
            console.error(e);
        }
    }
}

async function scanTransaction(txHash, cashiers) {
    try {
        var tx = await web3.eth.getTransaction(txHash);
    } catch (e) {
        console.error(`Can't find tx by its hash ${txHash}`);
        return;
    }
    if (null === tx) {
        await redis.rpushAsync(FAILED_TRANSACTION_KEY, txHash);
        return;
    }
    if (tx.to == null) {
        return;
    }

    return Promise.map(cashiers, async cashier => {
        await cashier.audit(tx);
    });
}

module.exports = new BlockScanner();
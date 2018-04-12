/**
 * This script allows you set the coinbase of the system.
 * 
 * What coinbase does are as following:
 * 1. The coinbase sweeps eth/token from users' wallet
 * 2. The coinbase sends eth/token to user's wallet
 * 
 * The reason we have a coinbase is that we want our users free of transactions fee,
 * so instead of deposit some eth themselves, our coinbase pays all the fee.
 */
require('dotenv').config();

const usage = 'Usage: node set_coinbase.js [address] [privatekey]';
const userWallet = require('../models/UserWallet');

if (process.argv.length != 4) {
    console.error(usage);
    process.exit(2);
}

const address = process.argv[2];
const privatekey = process.argv[3];
userWallet.addAccount(address, privatekey)
.then(() => { process.exit(0) })
.catch(e => {
    console.error(e);
    process.exit(1);
})
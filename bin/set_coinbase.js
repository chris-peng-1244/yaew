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
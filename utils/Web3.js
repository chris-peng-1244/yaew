const Web3 = require('web3');
const provider = new Web3(process.env.ETH_PROVIDER);
module.exports = provider;
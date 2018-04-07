require('dotenv').config();
const web3 = require('../utils/Web3');
const timer = require('../utils/Timer');
const blockScanner = require('../models/BlockScanner');

web3.eth.getBlockNumber()
    .then(async blockNumber => {
        await blockScanner.init();
        let number = await blockScanner.getLastScannedBlockNumber(blockNumber) + 1;
        while (true) {
            while (number <= blockNumber) {
                console.log(`Scanning block ${number}`);
                try {
                    await blockScanner.scan(number);
                } catch (e) {
                    console.error(e)
                }
                number++;
            }
            console.log('Waiting for new blocks...');
            await timer.setTimeout(1000);
            blockNumber = await web3.eth.getBlockNumber();
        }
    });
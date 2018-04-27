require('dotenv').config();
require('colors');
const web3 = require('../utils/Web3');
const timer = require('../utils/Timer');
const blockScanner = require('../models/BlockScanner');
const Bluebird = require('bluebird');
const _ = require('lodash');

// TODO: should record the scanned transactions in case that they are repeatedly scanned
web3.eth.getBlockNumber()
  .then(async blockNumber => {
    await blockScanner.init();
    let number = await blockScanner.getLastScannedBlockNumber(blockNumber);
    while (true) {
      if (number >= blockNumber) {
        console.log('Waiting for new blocks...');
        await timer.setTimeout(2000);
        try {
          blockNumber = await web3.eth.getBlockNumber();
        } catch (e) { console.error(e); }
        continue;
      }

      // Start from new block, so
      // [number+1] to blockNumber
      const range = _.range(number + 1, blockNumber + 1);
      const pageSize = 3;
      const page = Math.ceil(range.length / pageSize);
      for (let i = 0; i < page; i++) {
        let promises = [];
        range.slice(i * pageSize, (i + 1) * pageSize).forEach(number => {
          promises.push(scan(number));
        });
        await Bluebird.all(promises);
      }
      number = blockNumber;
    }
  });

async function scan(number) {
  console.log(`Scanning block ${number}`);
  try {
    const success = await blockScanner.scan(number);
    if (success) console.log(`Block ${number} scanned`.green);
    else console.log(
      `Block ${number} cannot be scanned, added to failed queue`.red.bold
    );
  } catch (e) {
    console.error(`Fatal: ` + e)
  }
}
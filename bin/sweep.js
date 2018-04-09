require('dotenv').config();
const colors = require('colors');
const userWallet = require('../models/UserWallet');
const Bluebird = require('bluebird');
const Token = require('../models/Token');
const TokenSweeper = require('../models/TokenSweeper');

let walletBalances = {};
userWallet.count()
  .then(async count => {
    if (count == 0) {
      return;
    }

    const pageSize = 4;
    const page = Math.ceil(count / pageSize);
    const tokenSweepers = [
      await TokenSweeper.create(Token.MYTOKEN),
      TokenSweeper.create(Token.ETH)
    ];
    let wallets = [];
    for (let i = 1; i <= page; i++) {
      wallets = await userWallet.findAll(i, pageSize);
      await Bluebird.mapSeries(tokenSweepers, tokenSweeper => {
        return tokenSweeper.sweep(wallets)
      });
    }
    console.log('Sweeping done'.cyan);
    process.exit(0);
  });

  process.on('unhandledRejection', (reason, p) => {
    console.error(reason.stack);
  });
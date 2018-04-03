require('dotenv').config();
const userWallet = require('../models/UserWallet');
const Bluebird = require('bluebird');
const Token = require('../models/Token');
const redis = require('../utils/Redis');
const web3 = require('../utils/Web3');
const gasPrice = require('../utils/GasPrice');

let sweepTaskList = [];

userWallet.count()
.then(async count => {
  if (count == 0) {
    return;
  } 

  const token = await Token.create(Token.MYTOKEN);
  const pageSize = 1000;
  const page = Math.ceil(count / pageSize);
  for (let i = 1; i <= page; i++) {
    sweepTaskList.push(sweepWallet(i, pageSize, token));
  }
  await Bluebird.all(sweepTaskList);
  redis.quit();
});

async function sweepWallet(page, pageSize, token)
{
  const wallets = await userWallet.findAll(page, pageSize);
  return await Bluebird.filter(wallets, async wallet => {
    return await userWallet.getBalance(wallet, token) > 0;
  })
  .each(wallet => {
    return fundWallet(wallet);
  });
}

async function fundWallet(wallet) {
  const token = await Token.create(
    Token.ETH, 
    gasPrice.getEthTransactionGasUsed(60000, process.env.SWEEP_GAS_PRICE)
  );
  const hash = await userWallet.transfer(process.env.ETH_COINBASE, wallet, token, 
    gasPrice.getGasPrice(process.env.SWEEP_GAS_PRICE));
  console.log(hash);
  return hash;
}
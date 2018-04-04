require('dotenv').config();
const userWallet = require('../models/UserWallet');
const TxReceipt = require('../models/TransactionReceipt');
const Bluebird = require('bluebird');
const Token = require('../models/Token');
const redis = require('../utils/Redis');
const web3 = require('../utils/Web3');
const timer = require('../utils/Timer');
const gasPrice = require('../utils/GasPrice');
const SWEEP_GAS_PRICE = gasPrice.getGasPrice(process.env.SWEEP_GAS_PRICE);

let walletBalances = {};
userWallet.count()
.then(async count => {
  if (count == 0) {
    return;
  } 

  const token = await Token.create(Token.MYTOKEN);
  const pageSize = 1000;
  const page = Math.ceil(count / pageSize);
  for (let i = 1; i <= page; i++) {
    await fundWallets(i, pageSize, token);
  }
  redis.quit();
});

async function fundWallets(page, pageSize, token)
{
  const wallets = await userWallet.findAll(page, pageSize);
  await Bluebird.filter(wallets, async wallet => {
    const balance = await userWallet.getBalance(wallet, token);
    if (balance > 0) {
      console.log(`Wallet ${wallet} has balance ${balance}`);
      walletBalances[wallet] = balance;
    }
    return balance > 0;
  }).each(async wallet => {
    return await fundWallet(wallet);
  });
}

async function fundWallet(wallet) {
  const token = await Token.create(
    Token.ETH, 
    gasPrice.getEthTransactionGasUsed(60000, process.env.SWEEP_GAS_PRICE)
  );
  const { error, hash } = await userWallet.transfer(process.env.ETH_COINBASE, wallet, token, SWEEP_GAS_PRICE);
  if (error) {
    return;
  }
  console.log(`Fund ${wallet} wallet: ${hash}`);
  let confirmed = false;
  const maxWait = 1800;
  let wait = 0;
  while (confirmed == false && wait++ < maxWait) {
    await timer.setTimeout(10000);
    const {error, tx} = await TxReceipt.of(hash);
    if (tx == null) continue;
    if (tx.confirmNumber >= 1) {
      confirmed = true;
      const myToken = await Token.create(Token.MYTOKEN, walletBalances[wallet]);
      const result = await userWallet.transfer(wallet, process.env.ETH_COINBASE, myToken, SWEEP_GAS_PRICE);
      console.log(result);
    }
  }
}
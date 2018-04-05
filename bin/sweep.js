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
  process.exit(0);
});

async function fundWallets(page, pageSize, token)
{
  const wallets = await userWallet.findAll(page, pageSize);
  await Bluebird.filter(wallets, async wallet => {
    const balance = await userWallet.getBalance(wallet, token);
    const qualified = wallet != process.env.ETH_COINBASE.toLowerCase() && balance > 0;
    if (qualified) {
      console.log(`Wallet ${wallet} has balance ${balance}`);
      walletBalances[wallet] = balance;
    }
    return qualified;
  }).map(async wallet => {
    return await fundWallet(wallet);
  });
}

async function fundWallet(wallet) {
  const fundValue = gasPrice.getEthTransactionGasUsed(60000, process.env.SWEEP_GAS_PRICE);
  const token = await Token.create(Token.ETH, fundValue);
  console.log(`Funding ${wallet} wallet`);
  const { error, hash } = await userWallet.transferUntilConfirmed(process.env.ETH_COINBASE, wallet, token, SWEEP_GAS_PRICE, true);
  if (error) {
    return;
  }
  console.log(`Wallet ${wallet} funded with ${hash}`);
  const ethBalance = await userWallet.getBalance(wallet, token);
  if (ethBalance < fundValue) {
      console.error(`Wallet ${wallet} doesn't have enough ether`);
      return;
  }
  const myToken = await Token.create(Token.MYTOKEN, walletBalances[wallet]);
  const result = await userWallet.transfer(wallet, process.env.ETH_COINBASE, myToken, SWEEP_GAS_PRICE);
  console.log(`Swept ${wallet}: ${result.hash}`);
}
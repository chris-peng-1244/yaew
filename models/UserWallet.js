const redis = require('../utils/Redis');
const web3 = require('../utils/Web3');
const Token = require('../models/Token');
const Promise = require('bluebird');
const USER_WALLET_HASH = process.env.APP_NAME + '_user_wallets';

exports.create = async () => {
  const account = web3.eth.accounts.create(web3.utils.randomHex(32));
  const exists = await redis.hexistsAsync(USER_WALLET_HASH, account.address);
  if (!exists) {
    await redis.hsetAsync(USER_WALLET_HASH, account.address, account.privateKey);
  }
  return account;
};

async function getAccountByAddress(address) {
  const privateKey = await redis.hgetAsync(USER_WALLET_HASH, address);
  if (privateKey.length != 66) {
    return null;
  }
return web3.eth.accounts.privateKeyToAccount(privateKey);
};

exports.get = getAccountByAddress;

/**
 * 
 * @param string address 
 * @throws When the address is invalid or the network is lost.
 */
exports.getBalance = async (address) => {
    const balanceInWei = await web3.eth.getBalance(address);
    return web3.utils.fromWei(balanceInWei, "ether");
};

exports.transfer = async (from, to, token, gasPrice = 0) => {
  let result;
  if (token.getType() === Token.ETH) {
    result = await transferEth(from, to, token, gasPrice);
  } else {
    result = await transferEthToken(from, to, token, gasPrice);
  }
  const {error, hash} = result;
  if (error) {
    return { error: error, hash: null };
  }
  return new Promise((resolve, reject) => {
    hash
    .on('transactionHash', hash => {
      resolve({ error: null, hash: hash }); 
    })
    .on('error', error => {
      resolve({ error: error, hash: null });
    });
  });
};

async function transferEth(from, to, token, gasPrice) {
  let sender;
  try {
    sender = await getAccountByAddress(from);
  } catch (e) {
    return {
      error: `Can't deduce account from ${from}`,
      hash: null,
    }
  }

  const tx = {
    to: to,
    value: token.getAmount(),
    gas: 42000,
  };
  if (gasPrice > 0) {
    tx.gasPrice =  gasPrice;
  }
  const signedTx = await sender.signTransaction(tx);
  return {
    error: null,
    hash: web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  };
}

async function transferEthToken(from, to, token, gasPrice)
{
  let sender;
  try {
    sender = await getAccountByAddress(from);
  } catch (e) {
    return {
      error: `Can't deduce account from ${from}`,
      hash: null,
    }
  }

  const tx = {
    to: token.getAddress(),
    value: 0,
    data: getTokenTransactionData(to, token.getAmount()),
    gas: 100000,
  };
  if (gasPrice > 0) {
    tx.gasPrice =  gasPrice;
  }
  const signedTx = await sender.signTransaction(tx);
  return {
    error: null,
    hash: web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  };
}

function getTokenTransactionData(to, amount)
{
  return '0xa9059cbb' + to.substr(2).padStart(64, '0')
    + parseInt(amount).toString(16).padStart(64, '0');
}
const redis = require('../utils/Redis');
const web3 = require('../utils/Web3');
const Token = require('../models/Token');
const Promise = require('bluebird');
const Transaction = require('../models/Transaction');
const ERC20Contract = require('../models/ERC20Contract');
const Nonce = require('../models/Nonce');
const USER_WALLET_HASH = process.env.APP_NAME + '_user_wallets';
const USER_WALLET_ADDRESS_LIST = process.env.APP_NAME + '_user_wallet_address_list';

exports.create = async () => {
  const account = web3.eth.accounts.create(web3.utils.randomHex(32));
  const exists = await redis.hexistsAsync(USER_WALLET_HASH, account.address);
  if (!exists) {
    await redis.hsetAsync(USER_WALLET_HASH, account.address, account.privateKey);
    await redis.rpushAsync(USER_WALLET_ADDRESS_LIST, account.address);
    await Nonce.of(account.address).reset();
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

exports.findAll = async (page, pageSize = 1000) => {
  if (page < 1) {
    return [];
  }
  return await redis.lrangeAsync(USER_WALLET_ADDRESS_LIST, (page-1)*pageSize, (page)*pageSize);
};

exports.count = async () => {
  return await redis.llenAsync(USER_WALLET_ADDRESS_LIST);
};

/**
 * 
 * @param string address 
 * @throws When the address is invalid or the network is lost.
 */
exports.getBalance = async (address, token) => {
  if (token.getType() === Token.ETH) {
    const balanceInWei = await web3.eth.getBalance(address);
    return web3.utils.fromWei(balanceInWei, "ether");
  }
  return getTokenBalance(address, token);
};

async function getTokenBalance(address, token) {
  const contract = await ERC20Contract.at(token.getAddress());
  const result = await contract.methods.balanceOf(address).call();
  return parseInt(result)/Math.pow(10, token.getDecimal())+'';
};

exports.transfer = async (from, to, token, gasPrice = 0) => {
  const {error, hash} = await transfer(from, to, token, gasPrice);
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

async function transfer(from, to, token, gasPrice) {
  let sender;
  try {
    sender = await getAccountByAddress(from);
  } catch (e) {
    return {
      error: `Can't deduce account from ${from}`,
      hash: null,
    }
  }

  try {
    const tx = Transaction.createTransaction(from, to, token, gasPrice);
    var txObj = await tx.getTxObj();
  } catch (e) {
    return {
      error: e.message,
      hash: null,
    };
  }

  const signedTx = await sender.signTransaction(txObj);
  return {
    error: null,
    hash: web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  };
}
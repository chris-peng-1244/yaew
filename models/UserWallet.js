const redis = require('../utils/Redis');
const web3 = require('../utils/Web3');
const Token = require('../models/Token');
const Bluebird = require('bluebird');
const Transaction = require('../models/Transaction');
const ERC20Contract = require('../models/ERC20Contract');
const Nonce = require('../models/Nonce');
const BigNumber = require('bignumber.js');
const USER_WALLET_HASH = process.env.APP_NAME + '_user_wallets';
const USER_WALLET_ADDRESS_LIST = process.env.APP_NAME +
  '_user_wallet_address_list';

async function create() {
  const account = web3.eth.accounts.create(web3.utils.randomHex(32));
  await addAccount(account.address, account.privateKey);
  return account;
};

async function addAccount(address, privateKey) {
  address = address.toLowerCase();
  privateKey = privateKey.toLowerCase();
  const exists = await redis.hexistsAsync(USER_WALLET_HASH, address);
  if (!exists) {
    await redis.hsetAsync(USER_WALLET_HASH, address, privateKey);
    await redis.rpushAsync(USER_WALLET_ADDRESS_LIST, address);
    await Nonce.of(address).reset();
  }
}

async function getAccountByAddress(address) {
  address = address.toLowerCase();
  const privateKey = await redis.hgetAsync(USER_WALLET_HASH, address);
  if (privateKey.length != 66) {
    throw new Error(`Can't find account ${address}`);
  }
  return web3.eth.accounts.privateKeyToAccount(privateKey);
};

async function findAll(page, pageSize = 1000) {
  if (page < 1) {
    return [];
  }
  const start = (page - 1) * pageSize;
  const end = page * pageSize - 1;
  return await redis.lrangeAsync(USER_WALLET_ADDRESS_LIST, start, end);
};

async function count() {
  return await redis.llenAsync(USER_WALLET_ADDRESS_LIST);
};

/**
 * 
 * @param string address 
 * @throws When the address is invalid or the network is lost.
 * @return float
 */
async function getBalance(address, token) {
  if (token.getType() === Token.ETH) {
    const balanceInWei = await web3.eth.getBalance(address);
    return web3.utils.fromWei(balanceInWei, "ether");
  }
  return getTokenBalance(address, token);
};

async function getTokenBalance(address, token) {
  const contract = await ERC20Contract.at(token.getAddress());
  let result = await contract.methods.balanceOf(address).call();
  result = new BigNumber(parseInt(result));
  result = result.dividedBy(Math.pow(10, token.getDecimal()));
  return result.toNumber();
};

/**
 * Returns as soon as the transaction is sent 
 * @param {String} from 
 * @param {String} to 
 * @param {Token} token 
 * @param {int} gasPrice 
 */
async function transfer(from, to, token, gasPrice = 0, manageNonce = false) {
  const {
    error,
    hash
  } = await _transfer(from, to, token, gasPrice, manageNonce);
  if (error) {
    return {
      error: error,
      hash: null
    };
  }
  return new Bluebird((resolve, reject) => {
    hash
      .on('transactionHash', hash => {
        resolve({
          error: null,
          hash: hash
        });
      })
      .on('error', error => {
        resolve({
          error: error,
          hash: null
        });
      });
  });
};

/**
 * Returns only when transaction is confirmed by at least one block.
 * Or when error occurs.
 *  
 * @param {String} from 
 * @param {String} to 
 * @param {Token} token 
 * @param {int} gasPrice 
 */
async function transferUntilConfirmed(from, to, token, gasPrice = 0,
  manageNonce = false) {
  const {
    error,
    hash
  } = await _transfer(from, to, token, gasPrice, manageNonce);
  if (error) {
    return {
      error: error,
      hash: null
    };
  }
  return new Bluebird((resolve, reject) => {
    hash
      .on('confirmation', (confirmationNumber, receipt) => {
        if (confirmationNumber >= 1) {
          resolve({
            error: null,
            hash: receipt.transactionHash,
          });
        }
      })
      .on('error', error => {
        resolve({
          error: error,
          hash: null
        });
      });
  });
};

async function isValidUserWallet(address) {
  address = address.toLowerCase();
  const isValidUserWallet = await redis.hexistsAsync(USER_WALLET_HASH,
    address);
  return !isCoinbase(address) && isValidUserWallet;
};

function isCoinbase(address) {
  return address.toLowerCase() === process.env.ETH_COINBASE;
};

async function _transfer(from, to, token, gasPrice, manageNonce) {
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
    const tx = Transaction.createTransaction(from, to, token, gasPrice,
      manageNonce);
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

module.exports = {
  create: create,
  addAccount: addAccount,
  get: getAccountByAddress,
  findAll: findAll,
  count: count,
  getBalance: getBalance,
  isCoinbase: isCoinbase,
  isValidUserWallet: isValidUserWallet,
  transfer: transfer,
  transferUntilConfirmed: transferUntilConfirmed,
};
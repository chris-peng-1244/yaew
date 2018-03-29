const redis = require('../utils/Redis');
const web3 = require('../utils/Web3');
const USER_WALLET_HASH = process.env.APP_NAME + '_user_wallets';

exports.create = async () => {
  const account = web3.eth.accounts.create(web3.utils.randomHex(32));
  const exists = await redis.hexistsAsync(USER_WALLET_HASH, account.address);
  if (!exists) {
    await redis.hsetAsync(USER_WALLET_HASH, account.address, account.privateKey);
  }
  return account;
};

exports.get = async (address) => {
  const privateKey = await redis.hgetAsync(USER_WALLET_HASH, address);
  if (privateKey.length != 66) {
    return null;
  }
  return web3.eth.accounts.privateKeyToAccount(privateKey);
};

/**
 * 
 * @param string address 
 * @throws When the address is invalid or the network is lost.
 */
exports.getBalance = async (address) => {
    const balanceInWei = await web3.eth.getBalance(address);
    return web3.utils.fromWei(balanceInWei, "ether");
};
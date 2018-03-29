const redis = require('../utils/Redis');
const USER_WALLET_HASH = process.env.APP_NAME + '_user_wallets';

exports.create = async (address, privateKey) => {
  const exists = await redis.hexistsAsync(USER_WALLET_HASH, address);
  if (exists) {
    return false;
  }
  await redis.hsetAsync(USER_WALLET_HASH, address, privateKey);
  return true;
};
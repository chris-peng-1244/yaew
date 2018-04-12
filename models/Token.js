const redis = require('../utils/Redis');
const TOKEN_META = process.env.APP_NAME+'_token_metas';
const TOKEN_ADDRESS_TO_TYPE = process.env.APP_NAME+'_token_address_to_type';
const ETH = 1;
// TODO: Remove this ugly hard coded number
const MYTOKEN = 2;
const BigNumber = require('bignumber.js');

const Token = async (type, amount) => {
  const t = parseInt(type);
  const {address, decimal} = await getMeta(t);
  if (address === null) {
    throw new Error(`Token ${t} is not supported`);
  }
  // Value should be string to avoid precision errors.
  let value = new BigNumber(amount);
  value = value.times(Math.pow(10, decimal));

  return Object.freeze({
    getType: () => {
      return t;
    },
    getAmount: () => {
      return value.toNumber();
    },
    getAddress: () => {
      return address;
    },
    getDecimal: () => {
      return decimal;
    }
  });
};

exports.create = createToken;

async function createToken(type, amount = 0) {
  return await Token(type, amount);
}

exports.createFromAddress = async (address) => {
  address = address.toLowerCase();
  const type = await redis.hgetAsync(TOKEN_ADDRESS_TO_TYPE, address);
  if (null == type) {
    throw new Error(`Token at address ${address} is not supported`);
  }
  return await createToken(type);
};

exports.addNewToken = async (type, address, decimal) => {
  address = address.toLowerCase();
  if (await redis.hexistsAsync(TOKEN_META, type)) {
    return false;
  }
  await redis.hsetAsync(TOKEN_META, type, address+':'+decimal);
  await redis.hsetAsync(TOKEN_ADDRESS_TO_TYPE, address, type);
  return true;
};

async function getMeta(type) {
  if (type === ETH) {
    return { address: '0x0', decimal: 18 };
  }
  const tokenMeta = await redis.hgetAsync(TOKEN_META, type);
  if (!tokenMeta) {
    return { address: null, decimal: null };
  }
  const parts = tokenMeta.split(':');
  return { address: parts[0], decimal: parts[1] };
};

exports.ETH = ETH;
exports.MYTOKEN = MYTOKEN;
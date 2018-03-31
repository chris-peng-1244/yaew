const redis = require('../utils/Redis');
const TOKEN_META = process.env.APP_NAME+'_token_metas';
const ETH = 1;

const Token = async (type, amount) => {
  const t = parseInt(type);
  const {address, decimal} = await getMeta(t);
  if (address === null) {
    throw new Error(`Token ${t} is not supported`);
  }
  // Value should be string to avoid precision errors.
  const value = amount*Math.pow(10, decimal) + '';

  return Object.freeze({
    getType: () => {
      return t;
    },
    getAmount: () => {
      return value;
    },
    getAddress: () => {
      return address;
    }
  });
};

exports.create = (type, amount) => {
  return Token(type, amount);
};

exports.addNewToken = async (type, address, decimal) => {
  if (await redis.hexistsAsync(TOKEN_META, type)) {
    return false;
  }
  await redis.hsetAsync(TOKEN_META, type, address+':'+decimal);
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
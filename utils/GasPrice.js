const web3 = require('../utils/web3');

exports.getGasPrice = (price) => {
  if (price === null || price === undefined || isNaN(price)) {
    return 0;
  }

  price = parseInt(price, 10);
  if (price > process.env.MAX_GAS_PRICE || price < 0) {
    return 0;
  }
  return web3.utils.toWei(price+'', "gwei");
};
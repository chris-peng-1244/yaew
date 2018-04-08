const NONCE_LOCK = process.env.APP_NAME+'_nonce_lock_';
const NONCE = process.env.APP_NAME+'_nonce_';
const redis = require('../utils/Redis');
const web3 = require('../utils/Web3');
const timer = require('../utils/Timer');
exports.of = address => {
  return new Nonce(address);
};

class Nonce {
  constructor(address) {
    this.address = address.toLowerCase();
  }

  async get() {
    const maxWait = 20;
    let wait = 0;
    let nonce = -1;
    while (wait++ < maxWait) {
      // Lock this address
      const isFree = await redis.setnxAsync(NONCE_LOCK + this.address, 1);
      if (isFree == 0) {
        await timer.setTimeout(20);
        continue;
      }
      nonce = await redis.incrAsync(NONCE + this.address);
      // Unlock this address
      await redis.delAsync(NONCE_LOCK + this.address);
      break;
    }
    if (nonce < 0) {
      throw new Error("Can't get the nonce of " + this.address);
    }
    return nonce;
  }

  async reset() {
    const nonceOnEth = await web3.eth.getTransactionCount(this.address);
    await redis.set(NONCE + this.address, nonceOnEth-1);
  }
}
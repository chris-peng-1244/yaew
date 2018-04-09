const userWallet = require('../models/UserWallet');
const Token = require('../models/Token');
const gasPrice = require('../utils/GasPrice');
const Bluebird = require('bluebird');
const redis = require('../utils/Redis');
const web3 = require('../utils/Web3');
const SWEEP_GAS_PRICE = gasPrice.getGasPrice(process.env.SWEEP_GAS_PRICE);

class Sweeper {
  constructor(token) {
    this.getToken = () => {
      return token;
    };
    this._walletBalances = {};
  }

  async sweep(wallets) {
    throw new Error("This method should be implemented");
  }

  async _sweepWallet(wallet) {
    throw new Error("This method should be implemented");
  }
}

class TokenSweeper extends Sweeper {
  async sweep(wallets) {
    return await Bluebird.filter(wallets, async wallet => {
      const balance = await userWallet.getBalance(wallet, this.getToken());
      const qualified = (wallet != process.env.ETH_COINBASE.toLowerCase()) &&
        (balance > 0);
      if (qualified) {
        console.log(`Wallet ${wallet} has balance ${balance}`);
        this._walletBalances[wallet] = balance;
      }
      return qualified;
    }).map(wallet => {
      return this._sweepWallet(wallet);
    });
  }

  async _sweepWallet(wallet) {
    // Fund user's wallet before we sweep his tokens
    const fundValue = gasPrice.getEthTransactionGasUsed(60000, process.env.SWEEP_GAS_PRICE);
    const eth = await Token.create(Token.ETH, fundValue);
    console.log(`Funding ${wallet} wallet`);
    const {
      error,
      hash
    } = await userWallet.transferUntilConfirmed(process.env.ETH_COINBASE,
      wallet,
      eth, SWEEP_GAS_PRICE, true);
    if (error) {
      console.error("Funding failed: " + error);
      return false;
    }
    console.log(`Wallet ${wallet} funded with ${hash}`);

    // Sweep the tokens
    const tokenToBeTransfered = await Token.create(Token.MYTOKEN, this._walletBalances[
      wallet]);
    const result = await userWallet.transferUntilConfirmed(wallet, process.env.ETH_COINBASE,
      tokenToBeTransfered, SWEEP_GAS_PRICE);
    if (result.error) {
      console.error(result.error.message.red);
      return false;
    }
    console.log(`Swept ${wallet}: ${result.hash}`);
    return true;
  }
}

class EthSweeper extends Sweeper {
  async sweep(wallets) {
    return await Bluebird.filter(wallets, async wallet => {
      const balance = await userWallet.getBalance(wallet, this.getToken());
      const qualified = (wallet != process.env.ETH_COINBASE.toLowerCase()) &&
        (balance > process.env.MIN_SWEEP_ETH_AMOUNT);
      if (qualified) {
        console.log(`Wallet ${wallet} has balance ${balance} eth`);
        // Convert float to integer for precision
        let transferAmount = web3.utils.toWei(balance, "ether") - web3.utils
          .toWei(this._getTransferFee());
        this._walletBalances[wallet] = web3.utils.fromWei(transferAmount+'', "ether");
      }
      return qualified;
    }).map(wallet => {
      return this._sweepWallet(wallet);
    });
  }

  _getTransferFee() {
    return gasPrice.getEthTransactionGasUsed(21000, process.env.SWEEP_GAS_PRICE);
  }

  async _sweepWallet(wallet) {
    // Sweep the tokens
    const tokenToBeTransfered = await Token.create(Token.ETH, this._walletBalances[
      wallet]);
    console.log(`Sweeping ${wallet}`);
    const result = await userWallet.transferUntilConfirmed(wallet, process.env.ETH_COINBASE,
      tokenToBeTransfered, SWEEP_GAS_PRICE);
    if (result.error) {
      console.error(result.error.message.red);
      return false;
    }
    console.log(`Swept ${wallet}: ${result.hash}`);
    return true;
  }
}

exports.create = async tokenType => {
  const token = await Token.create(tokenType);
  if (tokenType == Token.MYTOKEN) {
    return new TokenSweeper(token);
  }
  return new EthSweeper(token);
};
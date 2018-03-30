const express = require('express');
const router = express.Router();
const boom = require('boom');
const web3 = require('../utils/Web3');
const GasPrice = require('../utils/GasPrice');
const UserWallet = require('../models/UserWallet');
const Token = require('../models/Token');

router.get('/:address', async (req, res, next) => {
  try {
    const balance = await UserWallet.getBalance(req.params.address);
    return res.json({
      code: 0,
      data: balance,
    })
  } catch (e) {
    return next(boom.badRequest(`Can't find balance of address: ${req.params.address}`));
  }
});

router.post('/', async (req, res, next) => {
  try {
    const account = await UserWallet.create();
    return res.json({
      code: 0,
      data: {
        address: account.address,
        privateKey: account.privateKey,
      },
    });
  } catch (e) {
    next(boom.badImplementation("POST /wallet "+e.message));
  }
});

router.post('/transfer', async (req, res, next) => {
  try {
    var token = await Token.create(req.body.tokenType, req.body.amount);
  } catch (e) {
    return next(boom.badRequest(e.message));
  }

  const from = req.body.from;
  const to = req.body.to;
  const gasPrice = GasPrice.getGasPrice(req.body.gasPrice);

  const { error, hash } = await UserWallet.transfer(from, to, token, gasPrice);
  if (error === UserWallet.INSUFFICIENT_TOKEN) {
    return next(boom.badRequest("User wallet doesn't have enough token to transfer"));
  } else if (error !== null) {
    return next(boom.badImplementation("Transfer failed: "+error));
  }

  return res.json({
    code: 0,
    data: hash,
  });
});

module.exports = router;
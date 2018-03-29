const express = require('express');
const router = express.Router();
const boom = require('boom');
const web3 = require('../utils/Web3');
const UserWallet = require('../models/UserWallet');

router.get('/:address', (req, res, next) => {
  return res.json({
    code: 0,
    data: req.params.address,
  })
});

router.post('/', async (req, res, next) => {
  const account = web3.eth.accounts.create(web3.utils.randomHex(32));
  try {
    const success = await UserWallet.create(account.address, account.privateKey);
    if (success) {
      return res.json({
        code: 0,
        data: {
          address: account.address,
          privateKey: account.privateKey,
        }
      });
      return res.json(boom.badImplementation("POST /wallet save account failed"));
    }
  } catch (e) {
    next(boom.badImplementation("POST /wallet "+e.message));
  }
});

module.exports = router;
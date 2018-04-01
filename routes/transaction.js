const express = require('express');
const router = express.Router();
const boom = require('boom');
const TransactionReceipt = require('../models/TransactionReceipt');

router.get('/:txId', async (req, res, next) => {
    const {error, tx} = await TransactionReceipt.of(req.params.txId);
    if (error) {
        return next(boom.badRequest(error));
    }
    return res.json({
        code: 0,
        data: tx,
    });
});

module.exports = router;
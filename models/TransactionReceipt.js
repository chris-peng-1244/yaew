const web3 = require('../utils/Web3');
const Token = require('../models/Token');
exports.of = async (txHash) => {
    try {
        let tx = await web3.eth.getTransaction(txHash);
        if (tx == null) {
            return {error: `Can't find transaction ${txHash}`, tx: null};
        }
        tx = await setValueAndTo(tx);
        tx.confirmNumber = await getConfirmNumber(tx);
        return {error: null, tx: tx};
    } catch (e) {
        return {error: e.message, tx: null};
    }
};

/**
 * If transaction is a token transaction, the value field is 0,
 * we have to interepete the real value from input field. 
 * 
 * Likewise, if transaction is a token transaction, the `to` field is the address of Contract,
 * we have to interepete the real `to` from `input` field. 
 * 
 * @param {Object} tx 
 * @throws When the ERC20 token is not supported
 */
async function setValueAndTo(tx) {
    if (tx.value != 0) {
        tx.value = web3.utils.fromWei(tx.value, "ether");
        return tx;
    }

    const data = tx.input;
    const token = await Token.createFromAddress(tx.to);
    tx.value = parseInt(tx.input.substr(74), 16)/Math.pow(10, token.getDecimal());
    tx.to = '0x' + tx.input.substr(34, 40);
    return tx;
}

async function getConfirmNumber(tx) {
    if (tx.blockNumber == null) {
        return 0;
    }

    const blockNumber = await web3.eth.getBlockNumber();
    return blockNumber - tx.blockNumber;
}
/**
 * Use this script should you mess up the nonce of coinbase.
 */
require('dotenv').config();
const Nonce = require('../models/Nonce');
if(process.argv.length != 3) {
  console.error("Usage node reset_nonce.js [address]");
}
const nonce = Nonce.of(process.argv[2]);
nonce.reset().then(() => {
  process.exit(0);
});
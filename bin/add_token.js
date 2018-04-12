/**
 * This script add your token to the database
 * You need to provide the decimal, aka, precision of  your token
 * so we can calculate accordingly.
 */
require('dotenv').config();
const params = process.argv.slice(2);
if (params.length != 2) {
    console.error('Usage: node add_token [address] [decimal]');
    process.exit(1);
}

const Token = require('../models/Token');
const redis = require('../utils/Redis');
Token.addNewToken(Token.MYTOKEN, params[0], params[1])
.then(() => {
    redis.quit();
})
.catch(e => {
    console.error(e);
});
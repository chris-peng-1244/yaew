require('dotenv').config();
const params = process.argv.slice(2);
if (params.length != 3) {
    console.error('Usage: node add_token [typeInt] [address] [decimal]');
    process.exit(1);
}

const Token = require('../models/Token');
const redis = require('../utils/Redis');
Token.addNewToken(params[0], params[1], params[2])
.then(() => {
    redis.quit();
})
.catch(e => {
    console.error(e);
});
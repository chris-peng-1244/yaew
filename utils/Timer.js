const util = require('util');
const setTimeoutAsync = util.promisify(setTimeout);
exports.setTimeout = setTimeoutAsync;
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync(process.argv[2]));
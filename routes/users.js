const express = require('express');
const router = express.Router();
const boom = require('boom');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/login', (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  if (username !== process.env.API_USERNAME
    || !bcrypt.compareSync(password, process.env.API_PASSWORD)) {
      return next(boom.badRequest('Username or password is wrong'));
    }
  const token = jwt.sign({
    username: username,
  }, process.env.JWT_SECRET, {
    expiresIn: 86400
  });
  return res.json({
    code: 0,
    data: token,
  });
});

module.exports = router;

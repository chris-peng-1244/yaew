var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var helmet = require('helmet');
var winston = require('winston');
var bearerToken = require('express-bearer-token');
require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var walletRouter = require('./routes/wallet');
var auth = require('./middlewares/auth');

winston.add(winston.transports.File, {
  timestamp: true,
  filename: './logs/api.error.log',
  maxsize: 1048576,
  maxFiles: 7,
  prettyPrint: true,
  json: false,
});

var app = express();
app.use(helmet());
app.use(bearerToken());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json()); // application/json
app.use(bodyParser.urlencoded({ extended: true })); // application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use(auth);
app.use('/users', usersRouter);
app.use('/wallets', walletRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // If the error is caused by the server, log it
  if (err.isServer) {
    winston.error(`${req.path} ${err.message}`, err.data);
  }

  if (err.output) {
    return res.status(err.output.statusCode).json({
      code: err.output.payload.statusCode,
      message: err.message,
    });
  }
  return res.status(500).json({
    code: 500,
    message: err.message,
  });
});

module.exports = app;

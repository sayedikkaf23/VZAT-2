var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');
const envConfig = require('./config.env');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// Choose environment: 'sandbox' or 'production'
const ENV = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
const { mongoURI } = envConfig[ENV];

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(`MongoDB connected to ${ENV} database`))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;

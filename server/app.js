var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

// ----------------------------------------------------------------------------

var messages = [];

// ----------------------------------------------------------------------------

function addMessage(s) {
  messages.push(s);
}

function getMessagesHTML() {
  var s = '';
  for(var i = 0; i < messages.length; i++) {
    s = messages[i] + '<br>' + s;
  }
  return s;
}

// ----------------------------------------------------------------------------

var app = express();

app.use(favicon(path.join(__dirname, '/../public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname, '/../public/index.html'));
});

app.use(express.static(path.join(__dirname, '/../public')));

app.get('/api', (req, res) => {
  var s = '';
  for(var name in res.param) {
    s += '"' + name + '":"' + res.param[name] + '";';
  }
  res.send('Welcome to my superAPI: ' + s);
});

app.get('/api/:cmd/:param1', (req, res) => {
    res.send('API received command ' + req.params.cmd + ' with param1=' + req.params.param1);
    console.log(JSON.stringify(req.params, null, 4));
});

app.post('/api/get', (req, res) => {
  res.send(getMessagesHTML());
});

app.post('/api/say', (req, res) => {
  addMessage(req.body.message);
  res.send(getMessagesHTML());
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  //res.render('error');
  res.send('Error ' + err.status);
});

module.exports = app;

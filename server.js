var _ = require('underscore');
var express = require('express');
var http = require('http');
var redis = require('redis');

var app = express();
var client = redis.createClient();
client.exists('id', function (er, exists) {
  if (exists) return;
  client.set('id', 0);
});

app.use(express.bodyParser());

app.set('view engine', 'tmpl');
require('underscore-express')(app);

app.get('/', function (req, res) {
  res.render('index', {name: 'Bill'});
});

var getPoll = function (id, cb) {
  client.get('polls:' + id, function (er, data) {
    if (er) return cb(er);
    if (!data) return cb(404);
    cb(null, JSON.parse(data));
  });
};

app.get('/polls/:id', function (req, res, next) {
  getPoll(req.params.id, function (er, poll) {
    if (er) return next(er);
    res.send(poll);
  });
});

app.post('/polls', function (req, res, next) {
  var data = _.pick(req.body, 'question', 'answers');
  data.answers = _.reduce(data.answers, function (map, a) {
    map[a] = 0;
    return map;
  }, {});
  if (!data.question || !_.size(data.answers)) return next(400);
  client.incr('id', function (er, id) {
    if (er) return next(er);
    client.set('polls:' + id, JSON.stringify(data), function (er) {
      if (er) return next(er);
      res.send(data);
    });
  });
});

app.put('/polls/:id/vote/:index', function (req, res, next) {
  var id = req.params.id;
  getPoll(id, function (er, poll) {
    if (er) return next(er);
    var key = _.keys(poll.answers)[req.params.index];
    if (!key) return next(400);
    ++poll.answers[key];
    client.set('polls:' + id, JSON.stringify(poll), function (er) {
      if (er) return next(er);
      res.send(poll);
    });
  });
});

app.all('*', function (er, req, res, next) {

  // Log interesting errors.
  if (!_.isNumber(er)) console.error((er.stack || er).error);

  // Get the status code associated with the error.
  var message = http.STATUS_CODES[er] || http.STATUS_CODES[er = 500];
  var status = er;

  // Return an error message, taking the accepts header into account.
  if (req.accepts('json')) res.send(status, {error: message});
  res.send(status, message);
});

app.listen(8080);

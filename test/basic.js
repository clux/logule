var logule = require('../')
  , assert = require('assert')
  , levels = ['trace', 'debug', 'info', 'warn', 'error', 'zalgo', 'line']
  , l = logule.sub('suppressed').suppress.apply({}, levels)
  , log = logule.sub('LOGULE').get('info')
  , privates = ['internal', 'log', 'namespaces', 'size', 'removed']
  , pubs = [
    'get'
  , 'suppress'
  , 'sub'
  , 'pad'
  , 'verify'
  , 'data'
  , 'allow'
  ];

exports["test chaining"] = function () {
  levels.forEach(function (lvl) {
    var sub = l.sub('wee')
      , single = sub.get(lvl);
    assert.equal(l, l[lvl](1), 'l.' + lvl + " chains");
    assert.isUndefined(l.get(lvl)(1), "l.get('" + lvl + "') does not chain");
    assert.equal(sub.info('wat'), sub, "sub chains");
    assert.isUndefined(single('wat'), "sub single returns undefined");
  });

  log('chaining - completed:', 4 * levels.length);
};



exports["test encapsulation"] = function () {
  privates.forEach(function (p) {
    assert.isUndefined(l[p], 'l.' + p + ' is encapsulated');
  });
  log('encapsulation - completed:', privates.length);
};


exports["test exports"] = function () {
  var testCount = 2 * (pubs.length - 1)
    , expectedExports = levels.concat(pubs);

  pubs.forEach(function (p) {
    if (p === 'data') {
      return;
    }
    assert.isDefined(l[p], "l." + p + " is exported");
    assert.type(l[p], 'function', "l." + p + " is function");
  });

  testCount += 3;
  assert.isDefined(l.data, "l.data is exported");
  assert.isDefined(l.data.version, "l.data.version is exported");
  assert.isDefined(l.data.namespaces, "l.data.namespaces is exported");

  levels.forEach(function (lvl) {
    var fn = l.get(lvl);
    assert.type(fn, 'function', "l.get('" + lvl + "') returns a function");
    assert.isUndefined(fn(), "l.get('" + lvl + "')() returns undefined");
    testCount += 2;
  });

  Object.keys(l).forEach(function (exprt) {
    var val = l[exprt];
    assert.ok(expectedExports.indexOf(exprt) >= 0, "l exported key " + exprt + " is either a log convenience or one of the public functions");
    testCount += 1;
  });
  log("exports - completed:", testCount);
};

exports["test verify"] = function () {
  var testCount = 0;
  assert.ok(logule.verify(logule), "logule.verify(logule) is logule");
  assert.ok(!(logule.verify(logule.get('info'))), "logule.verify(logule.get('info')) is false");
  assert.ok(logule.sub('arst').verify(logule), "logule.sub('arst').verify(logule) is true");
  assert.ok(logule.verify(logule.sub('arst')), "logule.verify(logule.sub('arst')) is true");
  assert.ok(logule.verify(l), "logule.verify(l)");
  assert.ok(logule.verify(l.sub('arst')), "logule.verify(l.sub('arst'))");
  assert.ok(l.verify(logule), "l.verify(logule)");
  assert.ok(l.sub('arst').verify(logule), "l.sub('arst').verify(logule)");
  assert.ok(!l.verify(), "!l.verify()");
  assert.ok(!l.verify(null), "!l.verify(null)");
  assert.ok(!l.verify({}), "!l.verify({})");
  assert.ok(!l.verify({data:{version:null}}), "!l.verify(fakeObj)");
  testCount += 10;
  levels.forEach(function (lvl) {
    assert.ok(l.get(lvl) instanceof Function, "l.get('" + lvl + "') returns a function");
    testCount += 1;
  });
  log("exports - completed:", testCount);
};

exports["test sub"] = function () {
  assert.ok(logule === logule, "obvious test");
  assert.ok(logule !== logule.sub(), "logule.sub() does not return this");
  log('sub - completed', 2);
};


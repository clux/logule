var l = require('../').init(module)
  , levels = ['trace', 'debug', 'info', 'warn', 'error', 'zalgo', 'line']
  , pubs = ['get', 'mute', 'unmute', 'muteOnly', 'unmuteOnly', 'sub'];

exports.chaining = function (t) {
  levels.forEach(function (lvl) {
    // NB: some of the get calls return noop and will never chain
    t.equal(l, l[lvl](1), 'l.' + lvl + " chains");
    t.equal(l.get(lvl)('wat'), undefined, "get " + lvl + " does not chains");
  });
  t.done();
};


exports.exports = function (t) {
  pubs.forEach(function (p) {
    t.ok(l[p] !== undefined, "l." + p + " is exported");
    t.equal(typeof l[p], 'function', "l." + p + " is function");
  });

  levels.forEach(function (lvl) {
    var fn = l.get(lvl);
    t.equal(typeof fn, 'function', "l.get('" + lvl + "') returns a function");
    t.ok(fn() === undefined, "l.get('" + lvl + "')() returns undefined");
  });

  t.done();
};

exports.subs = function (t) {
  t.ok(l !== l.sub(), "l.sub() does not return same instance");
  t.done();
};

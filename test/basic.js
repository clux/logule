var l = require('../').init(module)
  , test   = require('tap').test
  , levels = ['trace', 'debug', 'info', 'warn', 'error', 'zalgo', 'line']
  , pubs = ['get', 'mute', 'unmute', 'muteOnly', 'unmuteOnly', 'sub'];

test("chaining", function (t) {
  levels.forEach(function (lvl) {
    // NB: some of the get calls return noop and will never chain
    t.equal(l, l[lvl](1), 'l.' + lvl + " chains");
    t.equal(l.get(lvl)('wat'), undefined, "get " + lvl + " does not chains");
  });
  t.end();
});


test("exports", function (t) {
  pubs.forEach(function (p) {
    t.ok(l[p] !== undefined, "l." + p + " is exported");
    t.type(l[p], 'function', "l." + p + " is function");
  });

  levels.forEach(function (lvl) {
    var fn = l.get(lvl);
    t.type(fn, 'function', "l.get('" + lvl + "') returns a function");
    t.ok(fn() === undefined, "l.get('" + lvl + "')() returns undefined");
  });

  t.end();
});

test("subs", function (t) {
  t.ok(l !== l.sub(), "l.sub() does not return same instance");
  t.end();
});

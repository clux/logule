var logule = require('../').init(module)
  , test   = require('tap').test
  , levels = ['trace', 'debug', 'info', 'warn', 'error', 'zalgo', 'line']
  , pubs = ['get', 'mute', 'unmute', 'muteOnly', 'muteExcept', 'sub']
  , l = logule.sub('suppressed');
l.mute.apply(l, levels); // l is always suppressed

test("chaining", function (t) {
  levels.forEach(function (lvl) {
    var sub = l.sub('wee')
      , single = sub.get(lvl);
    t.equal(l, l[lvl](1), 'l.' + lvl + " chains");
    t.equal(l.get(lvl)(1), undefined, "l.get('" + lvl + "') does not chain");
    t.equal(sub.info('wat'), sub, "sub chains");
    t.equal(single('wat'), undefined, "sub single returns undefined");
  });
  t.end();
});


test("exports", function (t) {
  var expectedExports = levels.concat(pubs);

  pubs.forEach(function (p) {
    if (p === 'data') {
      return;
    }
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
  t.ok(logule === logule, "obvious test");
  t.ok(logule !== logule.sub(), "logule.sub() does not return this");
  t.end();
});

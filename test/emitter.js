var logule = require('../')
var l = logule.init(module, "emitterTest")
var emitter = logule.emitter
  , dye = require('dye')
  , test   = require('tap').test
  , levels = ['trace', 'debug', 'info', 'warn', 'error', 'zalgo', 'line']
  , pubs = ['get', 'mute', 'unmute', 'muteOnly', 'unmuteOnly', 'sub'];

var stack = [];
emitter.on('log', function (l) {
  stack.push(l);
});

test("exports", function (t) {
  levels.forEach(function (lvl) {
    var len = stack.length;
    l.sub('woot')[lvl]("hi thar mistar 00%d, you are %s!", 7, "cool");
    t.ok(stack.length > len, "this emitted a log");

    var el = stack[stack.length-1];
    t.type(el.message, 'string', "last thing is a string");
    t.equal(dye.stripColors(el.message), el.message, "no colors from " + lvl);
    t.deepEqual(el.namespaces.map(dye.stripColors), el.namespaces, "namespaces");
    t.equal(el.namespaces[0], "emitterTest", "inited with a namespace");
    t.equal(el.namespaces.length, 2, "2 namespaces found");
    if (lvl === 'line') {
      t.ok(el.line, "line attribute set on line");
      t.equal(dye.stripColors(el.line), el.line, "no colors in line");
    }
    t.ok(el.time instanceof Date, 'time is a date instance');
  });

  t.end();
});

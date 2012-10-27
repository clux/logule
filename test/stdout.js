var l = require('../').init(module)
  , test   = require('tap').test
  , levels = ['trace', 'debug', 'info', 'warn', 'error', 'zalgo', 'line']
  , suppressed = ['trace', 'debug'] // will never speak
  , stack = [];

// hook into stdout to see what's being sent to it
process.stdout.write = (function(write) {
  return function(buf, encoding, fd) {
    write.call(process.stdout, buf, encoding, fd);
    stack.push(buf.toString()); // our extra
  };
}(process.stdout.write));

var didPrint = function (str) {
  return stack[stack.length-1].indexOf(str) >= 0;
};

test("stdout", function (t) {
  var verifyOutput = function (log, canSpeak, lvl, ns, isSingle) {
    var oldsize = stack.length
      , count = 0
      , testMsg = "this is %s number %d with %j"
      , expected = "this is message number " + count + " with {}";

    // try to log the thing
    var fn = (isSingle) ? log : log[lvl].bind(log);
    var ret = fn(testMsg, 'message', count, {}, "extra");
    t.equal(ret, isSingle ? undefined : log, "should chain iff not single fn");

    if (!isSingle) {
      if (canSpeak) {
        t.ok(log.removed.indexOf(lvl) < 0, lvl + " can speak and is not removed");
      }
      else if (suppressed.indexOf(lvl) < 0){
        t.ok(log.removed.indexOf(lvl) >= 0, lvl + " can not speak and is removed");
      }
    }

    if (!canSpeak) {
      t.equal(stack.length, oldsize, "no message was printed");
    }
    else {
      t.equal(stack.length, oldsize + 1, "a message was printed");
      t.ok(didPrint(lvl.toUpperCase()), "msg contains correct log type");
      if (ns) {
        t.ok(didPrint(ns), "msg contains namespace");
      }
      if (lvl !== 'zalgo') {
        t.ok(didPrint(expected), "msg contains input message");
        t.ok(didPrint("extra"), "msg contains extra param (not %s'd)");
      }
    }
    count += 1;
  };

  // verify all use cases
  levels.forEach(function (lvl, i) {
    var canSpeak = suppressed.indexOf(lvl) < 0;

    // verify normal log methods
    var normal = l.sub('NS' + i);
    verifyOutput(normal, canSpeak, lvl, 'NS' + i, false);

    // verify get methods
    var single = l.sub('GS' + i).get(lvl);
    verifyOutput(single, canSpeak, lvl, 'GS' + i, true);

    // verify suppress
    var noworky = l.sub('HA').unmuteOnly('info');
    verifyOutput(noworky, lvl === 'info', lvl, 'HA', false);

    // verify unsuppress (of suppressed ones)
    var worky = noworky.sub('WO').muteOnly('warn');
    verifyOutput(worky, canSpeak && lvl !== 'warn', lvl, 'WO', false);
  });
  t.end();
});

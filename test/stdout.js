var logule = require('../')
  , assert = require('assert')
  , levels = ['trace', 'debug', 'info', 'warn', 'error', 'zalgo', 'line']
  , l = logule.sub('suppressed').suppress.apply({}, levels)
  , log = logule.sub('LOGULE').get('info')
  , testMsg = "this is a test message";

// monkey-patch process.stdout to intercept its messages
function hook(cb) {
  var write = process.stdout.write;
  process.stdout.write = function (string, encoding, fd) {
    /* Hide output in test
    write.apply(process.stdout, arguments);*/
    cb(string, encoding, fd);
  };

  // return an undo damage fn returned
  return function () {
    process.stdout.write = write;
  };
}


exports["test stdout"] = function () {
  var testCount = 0
    , stdlog = logule.sub('STDOUT')
    , output = [];

  var unhook = hook(function (str, enc, fd) {
    output.push(str);
  });

  var last = function () {
    return output[output.length - 1];
  };

  // output from all shortcut methods is sensible
  levels.forEach(function (lvl) {
    var oldsize = output.length;
    stdlog[lvl](testMsg);
    assert.includes(last(), lvl.toUpperCase(), "captured stdlog contains correct log type");
    assert.includes(last(), testMsg, "captured stdlog contains input message");
    assert.includes(last(), "STDOUT", "captured stdlog contains namespace");
    assert.equal(oldsize + 1, output.length, "hook pushed a str onto the output array");
    testCount += 4;
  });

  // output from get(lvl) functions is sensible
  levels.forEach(function (lvl) {
    stdlog.sub('GOTTEN').get(lvl)(testMsg);
    assert.includes(last(), testMsg, "stdlog.get('" + lvl + "') logged the message");
    assert.includes(last(), lvl.toUpperCase(), "stdlog.get('" + lvl + "') preserves log level correctly");
    assert.includes(last(), 'STDOUT', "stdlog.get('" + lvl + "') preserves namespace1");
    assert.includes(last(), 'GOTTEN', "stdlog.get('" + lvl + "') preserves namespace2");
    testCount += 4;
  });

  stdlog.info('storing previous message');
  assert.includes(last(), "storing previous message", "storing works before testing suppressed functions");
  var oldmsg = last();
  testCount += 1;

  // suppressed methods do not send to stdout
  levels.forEach(function (lvl) {
    var stdsub = stdlog.sub().suppress(lvl);
    var single = stdsub.get(lvl);
    stdsub[lvl](testMsg);
    assert.equal(oldmsg, last(), "suppressed logger function does not send to stdout");
    single(testMsg);
    assert.equal(oldmsg, last(), "suppressed logger single function does not send to stdout");
    testCount += 2;
  });

  // subs of suppressed do not send to stdout
  levels.forEach(function (lvl) {
    var stdsub = stdlog.sub('THIS_DIES').suppress(lvl);
    stdsub.sub('SUBSUB')[lvl](testMsg);
    assert.equal(oldmsg, last(), "sub()." + lvl + " does not send to stdout when parent was suppressed");
    stdsub.sub('SUBSUB').get(lvl)(testMsg);
    assert.equal(oldmsg, last(), "sub().get('" + lvl + "') does not send to stdout when parent was suppressed");
    testCount += 2;
  });

  // but re-allowed ones will
  levels.forEach(function (lvl) {
    var stdsub = stdlog.sub('supandallow').suppress(lvl)
      , lastOut = last();
    stdsub[lvl]('i am suppressed');
    assert.equal(lastOut, last(), "suppresed message ignored for " + lvl);
    stdsub.allow(lvl);
    stdsub[lvl]('i am resurrected');
    assert.notEqual(lastOut, last(), "ressurrected method logs " + lvl + "again");
    lastOut = last(); // save new lastOut for later
  });

  // suppressing a level does not affect other levels
  levels.forEach(function (lvl) {
    var stdsub = stdlog.sub('SEMI').suppress(lvl);

    // via normal approach
    levels.forEach(function (lvl2) {
      if (lvl2 === lvl) {
        return;
      }
      var oldsize = output.length;
      stdsub[lvl2](testMsg);
      assert.includes(last(), "SEMI", "semi suppressed logger outputs when " + lvl2 + " not suppressed");
      assert.includes(last(), testMsg, "semi suppressed logger outputs when " + lvl2 + " not suppressed");
      assert.includes(last(), lvl2.toUpperCase(), "semi suppressed logger does indeed output as the log level matches " + lvl2);
      assert.equal(oldsize + 1, output.length, "hook pushed a str onto the output array (semi suppress)");
      testCount += 4;
    });

    // via get
    levels.forEach(function (lvl2) {
      if (lvl2 === lvl) {
        return;
      }
      var oldsize = output.length;
      stdsub.get(lvl2)(testMsg);
      assert.includes(last(), "SEMI", "semi suppressed logger outputs when " + lvl2 + " not suppressed");
      assert.includes(last(), testMsg, "semi suppressed logger single outputs when " + lvl2 + " not suppressed");
      assert.includes(last(), lvl2.toUpperCase(), "semi suppressed logger single does indeed output as the log level matches " + lvl2);
      assert.equal(oldsize + 1, output.length, "hook pushed a str onto the output array (semi suppress single)");
      testCount += 4;
    });

    // nor does it affect future subs
    levels.forEach(function (lvl2) {
      if (lvl2 === lvl) {
        return;
      }
      var oldsize = output.length;
      stdsub.sub('subSemi')[lvl2](testMsg);
      assert.includes(last(), "SEMI", "semi suppressed logger sub outputs when " + lvl2 + " not suppressed");
      assert.includes(last(), "subSemi", "semi suppressed logger sub outputs when " + lvl2 + " not suppressed");
      assert.includes(last(), testMsg, "semi suppressed logger single outputs when " + lvl2 + " not suppressed");
      assert.includes(last(), lvl2.toUpperCase(), "semi suppressed logger does indeed output as the log level matches " + lvl2);
      assert.equal(oldsize + 1, output.length, "hook pushed a str onto the output array (semi suppress sub)");
      testCount += 5;
    });

    // nor future subs' gets
    levels.forEach(function (lvl2) {
      if (lvl2 === lvl) {
        return;
      }
      var oldsize = output.length;
      stdsub.sub('subSemi').get(lvl2)(testMsg);
      assert.includes(last(), "SEMI", "semi suppressed logger sub single outputs when " + lvl2 + " not suppressed");
      assert.includes(last(), "subSemi", "semi suppressed logger sub single outputs when " + lvl2 + " not suppressed");
      assert.includes(last(), testMsg, "semi suppressed logger sub single outputs when " + lvl2 + " not suppressed");
      assert.includes(last(), lvl2.toUpperCase(), "semi suppressed logger sub single does indeed output as the log level matches " + lvl2);
      assert.equal(oldsize + 1, output.length, "hook pushed a str onto the output array (semi suppress sub single)");
      testCount += 5;
    });
  });

  // chaining works even when things are suppressed
  levels.forEach(function (lvl) {
    if (lvl === 'info') {
      return;
    }
    var stdsub = stdlog.sub('chainer').suppress(lvl)
      , oldsize = output.length;
    stdsub[lvl]('suppressed message').info('working message')[lvl]('another suppressed');
    assert.equal(oldsize + 1, output.length, "hook pushed a str onto the output array (chained 3 calls but 2 suppressed)");
    assert.includes(last(), 'working message', "chaining message for " + lvl + " onto suppressed info does log what we want");
    testCount += 2;
  });

  // multi output
  levels.forEach(function (lvl) {
    stdlog.sub('multi')[lvl](testMsg, 160000, 'WOWZA', {});
    assert.includes(last(), testMsg, "multi argument message to " + lvl + " contains argument 1");
    assert.includes(last(), 160000, "multi argument message to " + lvl + " contains argument 2");
    assert.includes(last(), "WOWZA", "multi argument message to " + lvl + " contains argument 3");
    assert.includes(last(), "{}", "multi argument message to " + lvl + " contains argument 4");
    testCount += 4;
  });

  // multi output single
  levels.forEach(function (lvl) {
    stdlog.sub('multi').get(lvl)(testMsg, 160000, 'WOWZA', {});
    assert.includes(last(), testMsg, "multi argument message to " + lvl + " contains argument 1");
    assert.includes(last(), 160000, "multi argument message to " + lvl + " contains argument 2");
    assert.includes(last(), "WOWZA", "multi argument message to " + lvl + " contains argument 3");
    assert.includes(last(), "{}", "multi argument message to " + lvl + " contains argument 4");
    testCount += 4;
  });

  unhook();
  log("stdout - completed", testCount);
};


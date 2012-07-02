var logule = require('../')
  , test   = require('tap').test
  , levels = ['trace', 'debug', 'info', 'warn', 'error', 'zalgo', 'line']
  , log = logule.sub('LOGULE').get('info')
  , testMsg = "this is a test message"
  , zalgo = "Ź̩̫͎ͨ̾ͪ̂̿͢AL̡̘̥̅̅̓͒͆ͥ̽GO̥͙̫ͤͤ͊̋ͦ̍͠" // this is the default
  , l = logule.sub('suppressed');
l.suppress.apply(l, levels);

// monkey-patch process.stdout.write to intercept console.log calls
var hook = function (cb) {
  var write = process.stdout.write;
  process.stdout.write = cb;

  // return an undo damage fn returned
  return function () {
    process.stdout.write = write;
  };
};


test("stdout", function (t) {
  var stdlog = logule.sub('STDOUT')
    , output = [];

  var unhook = hook(function (str, enc, fd) {
    output.push(str);
  });

  var last = function () {
    return output[output.length - 1];
  };

  var lastIncludes = function (x) {
    return last().indexOf(x) >= 0;
  };

  // output from all shortcut methods is sensible
  levels.forEach(function (lvl) {
    var oldsize = output.length
      , include = (lvl === 'zalgo') ? zalgo : lvl.toUpperCase();
    stdlog[lvl](testMsg);
    t.ok(lastIncludes(include), "captured stdlog contains correct log type");
    t.ok(lastIncludes(testMsg), "captured stdlog contains input message");
    t.ok(lastIncludes("STDOUT"), "captured stdlog contains namespace");
    t.equal(oldsize + 1, output.length, "hook pushed a str onto the output array");
  });

  // output from get(lvl) functions is sensible
  levels.forEach(function (lvl) {
    stdlog.sub('GOTTEN').get(lvl)(testMsg);
    var include = (lvl === 'zalgo') ? zalgo : lvl.toUpperCase();
    t.ok(lastIncludes(testMsg), "stdlog.get('" + lvl + "') logged the message");
    t.ok(lastIncludes(include), "stdlog.get('" + lvl + "') preserves log level correctly");
    t.ok(lastIncludes('STDOUT'), "stdlog.get('" + lvl + "') preserves namespace1");
    t.ok(lastIncludes('GOTTEN'), "stdlog.get('" + lvl + "') preserves namespace2");
  });

  stdlog.info('storing previous message');
  t.ok(lastIncludes("storing previous message"), "storing works before testing suppressed functions");
  var oldmsg = last();

  // suppressed methods do not send to stdout
  levels.forEach(function (lvl) {
    var stdsub = stdlog.sub().suppress(lvl)
      , single = stdsub.get(lvl);
    stdsub[lvl](testMsg);
    t.equal(oldmsg, last(), "suppressed logger function does not send to stdout");
    single(testMsg);
    t.equal(oldmsg, last(), "suppressed logger single function does not send to stdout");
  });

  // subs of suppressed do not send to stdout
  levels.forEach(function (lvl) {
    var stdsub = stdlog.sub('THIS_DIES').suppress(lvl);
    stdsub.sub('SUBSUB')[lvl](testMsg);
    t.equal(oldmsg, last(), "sub()." + lvl + " does not send to stdout when parent was suppressed");
    stdsub.sub('SUBSUB').get(lvl)(testMsg);
    t.equal(oldmsg, last(), "sub().get('" + lvl + "') does not send to stdout when parent was suppressed");
  });

  // but re-allowed ones will
  levels.forEach(function (lvl) {
    var stdsub = stdlog.sub('supandallow').suppress(lvl)
      , lastOut = last();
    stdsub[lvl]('i am suppressed');
    t.equal(lastOut, last(), "suppresed message ignored for " + lvl);
    stdsub.allow(lvl);
    stdsub[lvl]('i am resurrected');
    t.ok(lastOut !== last(), "ressurrected method logs " + lvl + "again");
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
      var oldsize = output.length
        , include = (lvl2 === 'zalgo') ? zalgo : lvl2.toUpperCase();
      stdsub[lvl2](testMsg);
      t.ok(lastIncludes("SEMI"), "semi suppressed logger outputs when " + lvl2 + " not suppressed");
      t.ok(lastIncludes(testMsg), "semi suppressed logger outputs when " + lvl2 + " not suppressed");
      t.ok(lastIncludes(include), "semi suppressed logger does indeed output as the log level matches " + lvl2);
      t.equal(oldsize + 1, output.length, "hook pushed a str onto the output array (semi suppress)");
    });

    // via get
    levels.forEach(function (lvl2) {
      if (lvl2 === lvl) {
        return;
      }
      var include = (lvl2 === 'zalgo') ? zalgo : lvl2.toUpperCase();
      var oldsize = output.length;
      stdsub.get(lvl2)(testMsg);
      t.ok(lastIncludes("SEMI"), "semi suppressed logger outputs when " + lvl2 + " not suppressed");
      t.ok(lastIncludes(testMsg), "semi suppressed logger single outputs when " + lvl2 + " not suppressed");
      t.ok(lastIncludes(include), "semi suppressed logger single does indeed output as the log level matches " + lvl2);
      t.equal(oldsize + 1, output.length, "hook pushed a str onto the output array (semi suppress single)");
    });

    // nor does it affect future subs
    levels.forEach(function (lvl2) {
      if (lvl2 === lvl) {
        return;
      }
      var include = (lvl2 === 'zalgo') ? zalgo : lvl2.toUpperCase();
      var oldsize = output.length;
      stdsub.sub('subSemi')[lvl2](testMsg);
      t.ok(lastIncludes("SEMI"), "semi suppressed logger sub outputs when " + lvl2 + " not suppressed");
      t.ok(lastIncludes("subSemi"), "semi suppressed logger sub outputs when " + lvl2 + " not suppressed");
      t.ok(lastIncludes(testMsg), "semi suppressed logger single outputs when " + lvl2 + " not suppressed");
      t.ok(lastIncludes(include), "semi suppressed logger does indeed output as the log level matches " + lvl2);
      t.equal(oldsize + 1, output.length, "hook pushed a str onto the output array (semi suppress sub)");
    });

    // nor future subs' gets
    levels.forEach(function (lvl2) {
      if (lvl2 === lvl) {
        return;
      }
      var oldsize = output.length;
      var include = (lvl2 === 'zalgo') ? zalgo : lvl2.toUpperCase();
      stdsub.sub('subSemi').get(lvl2)(testMsg);
      t.ok(lastIncludes("SEMI"), "semi suppressed logger sub single outputs when " + lvl2 + " not suppressed");
      t.ok(lastIncludes("subSemi"), "semi suppressed logger sub single outputs when " + lvl2 + " not suppressed");
      t.ok(lastIncludes(testMsg), "semi suppressed logger sub single outputs when " + lvl2 + " not suppressed");
      t.ok(lastIncludes(include), "semi suppressed logger sub single does indeed output as the log level matches " + lvl2);
      t.equal(oldsize + 1, output.length, "hook pushed a str onto the output array (semi suppress sub single)");
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
    t.equal(oldsize + 1, output.length, "hook pushed a str onto the output array (chained 3 calls but 2 suppressed)");
    t.ok(lastIncludes('working message'), "chaining message for " + lvl + " onto suppressed info does log what we want");
  });

  // multi output
  levels.forEach(function (lvl) {
    stdlog.sub('multi')[lvl](testMsg, 160000, 'WOWZA', {});
    t.ok(lastIncludes(testMsg), "multi argument message to " + lvl + " contains argument 1");
    t.ok(lastIncludes(160000), "multi argument message to " + lvl + " contains argument 2");
    t.ok(lastIncludes("WOWZA"), "multi argument message to " + lvl + " contains argument 3");
    t.ok(lastIncludes("{}"), "multi argument message to " + lvl + " contains argument 4");
  });

  // multi output single
  levels.forEach(function (lvl) {
    stdlog.sub('multi').get(lvl)(testMsg, 160000, 'WOWZA', {});
    t.ok(lastIncludes(testMsg), "multi argument message to " + lvl + " contains argument 1");
    t.ok(lastIncludes(160000), "multi argument message to " + lvl + " contains argument 2");
    t.ok(lastIncludes("WOWZA"), "multi argument message to " + lvl + " contains argument 3");
    t.ok(lastIncludes("{}"), "multi argument message to " + lvl + " contains argument 4");
  });

  unhook();
  t.end();
});


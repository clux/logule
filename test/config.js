var path   = require('path')
  , fs     = require('fs')
  , test   = require('tap').test
  , levels = ['trace', 'debug', 'warn', 'info', 'error', 'line', 'zalgo'];

var cfg = path.join(process.cwd(), '.logule');
var cfgHook = function (obj) {
  // write new config
  var str = "module.exports = " + JSON.stringify(obj) + ";";
  fs.writeFileSync(cfg, str, 'utf8');
  // synchronously require logule again to force loading cfg
  return require('../');
};
var cfgClean = function () {
  fs.unlinkSync(cfg);
};

// monkey-patch process.stdout to intercept its messages
var hook = function (cb) {
  var write = process.stdout.write;
  process.stdout.write = cb;

  // return an undo damage fn returned
  return function () {
    process.stdout.write = write;
  };
};

var random = function (a, b) {
  return Math.floor(Math.random() * (1 + b - a)) + a;
};

test("config1", function (t) {
  t.ok(true, "wee");

  var output = [];

  var unhook = hook(function (str, enc, fd) {
    output.push(str);
  });

  var last = function () {
    return output[output.length - 1];
  };

  var lastIncludes = function (x) {
    return last().indexOf(x) >= 0;
  };

  var tests = [];
  tests.push(function () {
    var cfg = {
      levels : {
        log    : 'red'
      , warn   : 'blue'
      }
    , suppress : ['warn']
    , allow : ['warn']
    , formatting : {
        dateType : 'precision'
      }
    };
    var l = cfgHook(cfg);

    t.type(l.log, "function", "levels exports extra methods");
    t.type(l.error, "function", "but default levels are not overwritten");

    l.log('wee');
    t.ok(lastIncludes('LOG'), "custom method works");

    // check plain date default
    l.log("hi");
    var msg = last();
    t.ok(lastIncludes('-'), "default delimiter");
    t.ok(/\d\d:\d\d:\d\d\.\d\d\d[^\d]/.test(msg), "dd:mm:ss:mss is precision");
    l.warn('bad');
    t.equal(last(), msg, "suppressing works in config"); // ignores allow list!
  });

  tests.push(function () {
    var l = cfgHook({});
    t.ok(l.warn, "warn exists with default");
    l.warn("hi2");
    t.ok(/.{5}\d\d:\d\d:\d\d[^\.]/.test(last()), "dd:mm:ss default");
  });

  //var idx = random(0, tests.length);
  var idx = 1;
  tests[idx]();

  cfgClean();
  unhook();
  t.end();
});


/*test("config3", function (t) {
  cfg = {delimiter : '<'};
  l = cfgHook(cfg);

  levels.forEach(function (lvl) {
    t.type(l[lvl], "function", "lvl " + lvl + " exists by default");
  });

  t.ok(lastIncludes('<'), "delimiter works");
});
*/

var fs = require('fs')
  , path = require('path')
  , events = require('events')
  , dye = require('dye')
  , set = require('subset')
  , $ = require('autonomy')
  , t = require('typr')
  , fallback = require('path').dirname(module.parent.filename)
  , cfgPath = require('confortable')('.logule.json', process.cwd(), fallback)
  , C = {}; // exports object

// log levels locked down
C.levels = ["trace", "debug", "line", "info", "warn", "error", "zalgo"];

// find and merge the the custom config (if exists) with the default one
var mergeCfgs = function () {
  var def = require('../.logule.json') // can't mess this one up
    , cfg = {};

  if (cfgPath) {
    cfg = fs.readFileSync(cfgPath);
    try {
      cfg = JSON.parse(cfg);
    }
    catch (e) {
      console.error("invalid JSON in custom logule config: %s", cfgPath);
      throw e;
    }
  }

  // merge 1 level deep in config to ensure we have sensible defaults
  Object.keys(cfg).forEach(function (sub) {
    if (t.hasKeys(cfg[sub]) && t.hasKeys(def[sub])) {
      $.extend(def[sub], cfg[sub]);
    }
  });
  return def;
};
var cfg = mergeCfgs();

// line helper
var getStack = function () {
  var orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function (err, stack) {
    return stack;
  };
  var err = new Error();
  Error.captureStackTrace(err, arguments.callee);
  var stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack;
};

C.line = function () {
  // 3 frame diff now: {0: this, 1: _log, 2: line(), 3: actual callsite}
  var frame = getStack()[3];
  return path.basename(frame.getFileName()) + ':' + frame.getLineNumber();
};


// timestamp formatting

// helper -ensure n has at least d digits by padding zeroes in front
var prep = function (n, d) {
  return ("000" + n).slice(-d); // works for 3 digits
};

var makeStamper = function (ts) {
  if (Object(ts) === ts) {
    return function () {
      var n = new Date()
        , d = '';
      if (ts.date) {
        var da = [n.getFullYear(), prep(n.getMonth() + 1, 2), prep(n.getDate(), 2)];
        if (ts.reverse) {
          da = da.reverse();
        }
        d = da.join(ts.delimiter) + ' ';
      }
      d += prep(n.getHours(), 2);
      d += ':' + prep(n.getMinutes(), 2);
      d += ':' + prep(n.getSeconds(), 2);
      if (ts.precise) {
        d += '.' + prep(n.getMilliseconds(), 3);
      }
      return d;
    };
  }
  if (ts === 'precision') {
    return function () {
      var d = new Date();
      return d.toLocaleTimeString() + '.' + prep(d.getMilliseconds(), 3);
    };
  }
  if (ts === 'none') {
    return $.noop;
  }

  // last chance, must be Date member fn
  if (!(new Date())[ts] instanceof Function) {
    throw new Error(cfgPath + ": illegal timestamp option " + ts);
  }
  return function () {
    return (new Date())[ts]();
  };
};

// fs WriteStream
if (cfg.filestream && cfg.filestream.file) {
  C.filestamp = makeStamper(cfg.filestream.timestamp);
  var logPath = path.join(path.dirname(cfgPath), cfg.filestream.file);
  C.filestream = fs.createWriteStream(logPath, {flags: 'a'});

  C.filesuppressed = cfg.filestream.allow ?
    set.difference(C.levels, cfg.filestream.allow) :
    cfg.filestream.suppress;
  C.filemutable = cfg.filestream.mutable;
}


// EventEmitter
if (cfg.emitter && cfg.emitter.enabled) {
  C.emitter = new events.EventEmitter();

  C.emitsuppressed = cfg.emitter.allow ?
    set.difference(C.levels, cfg.emitter.allow) :
    cfg.emitter.suppress;
  C.emitmutable = cfg.emitter.mutable;
}

// stdout
// how much we pad namespaces to - max level length of levels
var maxLvl = set.maximum($.pluck('length', C.levels));

// Pads a str to a str of length len
var pad = function (str, len) {
  if (str.length >= len) {
    return str;
  }
  return str + new Array(len - str.length + 1).join(' ');
};

// allow fn1.fn2 syntax in config, but ensure every fn in split('.') is on dye
var getDyes = function (str, lvl) {
  return (str || 'none').split('.').map(function (fn) {
    if (fn === 'none') {
      return $.id; // allow plain output
    }
    if (!(dye[fn] instanceof Function)) {
      throw new Error(cfgPath + ": illegal " + lvl + " color: " + fn);
    }
    return dye[fn];
  });
};

// verify colors are functions in dye
C.colors = ['namespace', 'timestamp', 'callsite'].reduce(function (acc, lvl) {
  var fns = getDyes(cfg.colors[lvl], lvl);
  acc[lvl] = $.apply(null, fns);
  return acc;
}, {});

// delims are pre-executed on stdout.delimiter so logule.js can [].join with them
C.colors.delim = C.levels.reduce(function (acc, lvl) {
  var fns = getDyes(cfg.delimiters[lvl], lvl);
  acc[lvl] = $.apply(null, fns)(cfg.stdout.delimiter);
  return acc;
}, {});

// levels are pre-executed on upper case level names (but padded to maxLvl)
C.colors.levels = C.levels.reduce(function (acc, lvl) {
  var padded = pad(lvl.toUpperCase(), maxLvl);
  var fns = getDyes(cfg.levels[lvl], lvl);
  acc[lvl] = $.apply(null, fns)(padded);
  return acc;
}, {});

// messages can also be styled for those craving full customization
C.colors.msg = C.levels.reduce(function (acc, lvl) {
  var fns = getDyes(cfg.messages[lvl], lvl);
  acc[lvl] = $.apply(null, fns);
  return acc;
}, {});

// format the up to cfg.nesting leading namespaces, padding the first if set
var nsPad = cfg.stdout.pad | 0;
C.nsFormat = function (ns) {
  var res = []
    , len = Math.min(ns.length, cfg.stdout.nesting | 0);
  for (var i = 0; i < len; i += 1) {
    var n = ns[i];
    if (i === 0 && nsPad) {
      n = pad(n, nsPad);
    }
    res.push(C.colors.namespace(n));
  }
  return res;
};

C.timestamp = makeStamper(cfg.stdout.timestamp);
C.suppressed = cfg.stdout.allow ?
  set.difference(C.levels, cfg.stdout.allow) :
  cfg.stdout.suppress;
C.stdoutmutable = cfg.stdout.mutable;


module.exports = C;

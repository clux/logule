var c = require('colors')
  , $ = require('autonomy')
  , set = require('subset')
  , semver = require('semver')
  , util = require('util')
  , fs = require('fs')
  , path = require('path')
  , version = require('./package').version
  , defaults = require('./.logule')
  , fallback = require('path').dirname(module.parent.filename)
  , custom = require('confortable')('.logule', process.cwd(), fallback)
  , slice = Array.prototype.slice
  , concat = Array.prototype.concat;

fs.existsSync || (fs.existsSync = path.existsSync);
var exists = function (file) {
  return fs.existsSync(file) && !fs.statSync(file).isDirectory();
};

// Pads a str to a str of length len
var pad = function (str, len) {
  return (str.length < len) ? str + Array(len - str.length + 1).join(' ') : str;
};

// obtained by self-executing config fn
var levels
  , delimMap
  , levelMap
  , getDate
  , prefixCol
  , dateCol
  , fileStream
  , globallyOff;

(function () { // get config and precompute everything needed
  var rawCfg = (custom) ? require(custom) : {};

  // extend levels on inner levels => no method removals => DI works
  var levObj = $.extend(defaults.levels, rawCfg.levels || {});

  // remaining cfg elements can be read from after a merge
  var cfg = $.extend(defaults, rawCfg);

  // prepare for JSON streaming if requested in config
  if (cfg.logFile) {
    var logPath = path.join(path.dirname(custom), cfg.logFile);
    fileStream = fs.createWriteStream(logPath, {flags: 'a'});
  }

  // cache color calls in delimMap/levelMap for _log
  levels = Object.keys(levObj);
  delimMap = levels.reduce(function (acc, lvl) {
    var fn = c[levObj[lvl]];
    if (!(fn instanceof Function)) {
      console.error("invalid color function for level '" + lvl + "' found in " + custom);
    }
    acc[lvl] = fn(cfg.delimiter);
    return acc;
  }, {});

  var max_lvl = set.maximum($.pluck('length', levels));

  levelMap = levels.reduce(function (acc, lvl) {
    var padded = pad(lvl === 'zalgo' ? cfg.zalgo : lvl.toUpperCase(), max_lvl);
    acc[lvl] = (cfg.bold.indexOf(lvl) >= 0) ? c.bold(padded) : padded;
    return acc;
  }, {});

  // misc colors
  prefixCol = c[cfg.prefixCol]; // used by _log
  dateCol = c[cfg.dateCol]; // used by _log
  if (!(prefixCol instanceof Function)) {
    console.error("invalid color function for prefixCol found in " + custom);
  }
  if (!(dateCol instanceof Function)) {
    console.error("invalid color function for dateCol found in " + custom);
  }

  // prepad a number with zeroes so that it's n characters long
  var prep = function (numb, n) {
    return ("000" + numb).slice(-n); // works for n <= 3
  };

  // highly customizable, and efficient date formatting shortcut for _log
  var f = cfg.formatting;
  if (f.dateType === 'precision') {
    getDate = function () {
      var d = new Date();
      return d.toLocaleTimeString() + '.' + prep(d.getMilliseconds(), 3);
    };
  }
  else if (f.dateType === 'method') {
    if (!(new Date())[f.dateMethod] instanceof Function) {
      console.error("Logule found invalid dateMethod in " + custom);
    }
    getDate = function () {
      return (new Date())[f.dateMethod]();
    };
  }
  else if (f.dateType === 'custom') {
    getDate = function () {
      var n = new Date()
        , d = '';
      if (f.showDate) {
        var da = [n.getFullYear(), prep(n.getMonth() + 1, 2), prep(n.getDate(), 2)];
        if (f.reverseDate) {
          da = da.reverse();
        }
        d = da.join(f.dateDelim) + ' ';
      }
      d += prep(n.getHours(), 2);
      d += ':' + prep(n.getMinutes(), 2);
      d += ':' + prep(n.getSeconds(), 2);
      if (f.showMs) {
        d += '.' + prep(n.getMilliseconds(), 3);
      }
      return d;
    };
  }
  else if (f.dateType === 'plain') {
    getDate = function () {
      return (new Date()).toLocaleTimeString();
    };
  }
  else {
    console.error("Logule found invalid dateType in " + custom);
  }

  // global suppression
  globallyOff = (cfg.useAllow) ? set.difference(levels, cfg.allow) : cfg.suppress;
}());

// callsite helper
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

// Logger class
function Logger() {}

// prototype defaults
var proto = {
  version : version
, removed : []
, size : 0
, namespaces : []
};

// make undeletable instance defaults up the prototype chain
Object.keys(proto).forEach(function (key) {
  Object.defineProperty(Logger.prototype, key, {
    value : proto[key]
  , writable : false
  , enumerable : false
  , configurable : false
  });
});

// Logger base method
Logger.prototype._log = function (lvl) {
  var args = arguments.length > 1 ? slice.call(arguments, 1) : []
    , d = delimMap[lvl];

  if (this.removed.indexOf(lvl) >= 0 || globallyOff.indexOf(lvl) >= 0) {
    return this;
  }

  var date = getDate();
  var padding = this.size;
  var ns = this.namespaces.map(function (n, i) {
    n = (i === 0) ? pad(n + '', padding) : n; // only pad first namespace level
    return prefixCol(c.bold(n)) + " " + d;
  });

  var message = util.format.apply(this, args);
  console.log.apply(console, [dateCol(date), d, levelMap[lvl], d].concat(ns, message));

  fileStream && fileStream.write(JSON.stringify({
    date : date
  , level : lvl
  , namespaces : this.namespaces
  , message : message
  }) + '\n');

  return this;
};

// Public methods

// Generate one helper method per specified level
levels.forEach(function (name) {
  if (name !== 'line' && name !== '_log') {
    Logger.prototype[name] = function () {
      return this._log.apply(this, concat.apply([name], arguments));
    };
  }
});

// Generate line logger separately
Logger.prototype.line = function () {
  var frame = getStack()[1];
  this.namespaces.push(frame.getFileName() + ":" + frame.getLineNumber());
  this._log.apply(this, concat.apply(['line'], arguments));
  this.namespaces.pop();
  return this;
};


// Return a single Logger helper method
Logger.prototype.get = function (fn) {
  if (levels.indexOf(fn) < 0) {
    this.namespaces.push('logule');
    this.error('Invalid Logule::get call for non-method: ' + fn);
    this.namespaces.pop();
  }
  else if (this.removed.indexOf(fn) < 0) {
    var self = this
      , l = this.sub();

    if (fn === 'line') {
      return function () {
        self.line.apply(l, arguments);
      };
    }
    return function () {
      self._log.apply(l, concat.apply([fn], arguments));
    };
  }
  return $.noop;
};

// Set the padding to size s
Logger.prototype.pad = function (s) {
  this.size = s | 0;
  return this;
};

// Suppress logs for specified levels
// Method is cumulative across new subsnamespaces/gets
Logger.prototype.suppress = function () {
  if (arguments.length) {
    this.removed = set.union(this.removed, slice.call(arguments, 0));
  }
  return this;
};


// Allow logs for specific levels
// Method is cumulative across new subs/gets
Logger.prototype.allow = function () {
  if (arguments.length) {
    this.removed = set.difference(this.removed, slice.call(arguments, 0));
  }
  return this;
};

// Subclass from a pre-configured Logger class to get extra namespace(s)
Logger.prototype.sub = function () {
  var sub = Object.create(this);
  sub.namespaces = concat.apply(this.namespaces, arguments);
  return sub;
};


// Verify that an instance is an up to date Logger instance
Logger.prototype.verify = function (inst) {
  if (!inst || inst.constructor !== Logger) {
    return false;
  }
  // inst.version only varies by patch number positively
  return semver.satisfies(inst.constructor.prototype.version, "~" + version);
};

// Prevent hacky prototype modifications via l.constructor.prototype
Object.freeze(Logger.prototype);

// Expose a root instance of Logger
module.exports = new Logger();

var c = require('colors')
  , $ = require('autonomy')
  , set = require('subset')
  , fs = require('fs')
  , path = require('path')
  , semver = require('semver')
  , version = require('./package').version
  , dotfile = require('./.logule')
  , slice = Array.prototype.slice
  , concat = Array.prototype.concat
  , config = 'Default config';

// Pads a str to a str of length len
var pad = function (str, len) {
  return (str.length < len) ? str + Array(len - str.length + 1).join(' ') : str;
};

// config searching and parsing
var findConfig = function (name) {
  var cwd = process.cwd()
    , exists = fs.existsSync || path.existsSync
    , cfg;

  if (path.relative(process.env.HOME, cwd).slice(0, 2) === '..') {
    // cwd is outside home, check cwd only
    cfg = path.join(cwd, name);
    return exists(cfg) ? cfg : null;
  }
  else {
    // cwd is somewhere under HOME start in cwd and go up until we hit HOME
    var dir = cwd;
    while (path.relative(process.env.HOME, dir).slice(0, 2) !== '..') {
      cfg = path.join(dir, name);
      if (exists(cfg)) {
        return cfg;
      }
      dir = path.join(dir, '..');
    }
    return null;
  }
};

var getConfig = function (name) {
  var file = findConfig(name);
  if (file === null) {
    return {};
  }
  config = file; // store path for error msgs
  return require(file);
};

// applyConfig obtains these
var levels
  , delimMap
  , levelMap
  , getDate
  , prefixCol
  , globallyOff;

(function applyConfig() {
  var obj = getConfig('.logule');

  // extend levels on inner levels => no method removals => DI works
  var levObj = $.extend(dotfile.levels, obj.levels || {});

  // remaining cfg elements can be read from after a merge
  var cfg = $.extend(dotfile, obj);

  // cache color calls in delimMap/levelMap for _log
  levels = Object.keys(levObj);
  delimMap = levels.reduce(function (acc, lvl) {
    var fn = c[levObj[lvl]];
    if (!(fn instanceof Function)) {
      console.error("invalid color function for level '" + lvl + "' found in " + config);
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
  var dateCol = c[cfg.dateCol]; // only used by getDate
  if (!(prefixCol instanceof Function)) {
    console.error("invalid color function for prefixCol found in " + config);
  }
  if (!(dateCol instanceof Function)) {
    console.error("invalid color function for dateCol found in " + config);
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
      return dateCol(d.toLocaleTimeString() + '.' + prep(d.getMilliseconds(), 3));
    };
  }
  else if (f.dateType === 'method') {
    if (!(new Date())[f.dateMethod] instanceof Function) {
      console.error("Logule found invalid dateMethod in " + config);
    }
    getDate = function () {
      return dateCol((new Date())[f.dateMethod]());
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
      d += prep(n.getHours(), 2)
        + ':' + prep(n.getMinutes(), 2)
        + ':' + prep(n.getSeconds(), 2);
      if (f.showMs) {
        d += '.' + prep(n.getMilliseconds(), 3);
      }
      return dateCol(d);
    };
  }
  else if (f.dateType === 'plain') {
    getDate = function () {
      return dateCol((new Date()).toLocaleTimeString());
    };
  }
  else {
    console.error("Logule found invalid dateType in " + config);
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

// instance defaults
var defaults = {
  version : version
, removed : []
, size : 0
, namespaces : []
};

// make undeletable instance defaults up the prototype chain
Object.keys(defaults).forEach(function (key) {
  Object.defineProperty(Logger.prototype, key, {
    value : defaults[key]
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

  var ns = this.namespaces.map(function (n) {
    return prefixCol(c.bold(pad(n + '', this.size))) + " " + d;
  });

  console.log.apply(console, [getDate(), d, levelMap[lvl], d].concat(ns, args));
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

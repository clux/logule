var c = require('colors')
  , fs = require('fs')
  , path = require('path')
  , semver = require('semver')
  , $ = require('subset')
  , version = require('./package').version
  , slice = Array.prototype.slice
  , concat = Array.prototype.concat
  , noop = function () {};

// Levels and their log output delimiter color fn
var levelMaps = {
  'zalgo' : function (str) {
    return c.magenta(c.zalgo(str));
  }
, 'error' : c.red
, 'warn'  : c.yellow
, 'info'  : c.green
, 'line'  : c.bold
, 'debug' : c.cyan
, 'trace' : c.grey
};
var levels = Object.keys(levelMaps);

// Maximum level length
var max_lvl = Math.max.apply({}, levels.map(function (l) {
  return l.length;
}));

// Pads a str to a str of length len
var pad = function (str, len) {
  return (str.length < len) ? str + new Array(len - str.length + 1).join(' ') : str;
};

// environment based filtering
var globallyOff = [];
if (process.env.LOGULE_SUPPRESS) {
  globallyOff = process.env.LOGULE_SUPPRESS.split(',');
}
else if (process.env.LOGULE_ALLOW) {
  globallyOff = $.difference(levels, process.env.LOGULE_ALLOW.split(','));
}

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

// Constructor helper
var construct = function (Ctor, args) {
  var F = function () {
    Ctor.apply(this, args);
  };
  F.prototype = Ctor.prototype;
  return new F();
};

// Logger class
function Logger() {
  // internal vars TODO: not writable/readable
  this.size = 0;
  this.removed = []; // this never contains duplicates, so can use efficient set ops

  // TODO: these should NOT be writable
  this.version = version;
  this.namespaces = (arguments.length > 0) ? slice.call(arguments, 0) : [];

  // TODO: Object.defineProperty on this!
}


// Internal error logger
// returns a new Logger with one extra namespace, can log despite filters
Logger.prototype.internal = function () {
  return construct(Logger, this.namespaces.concat('logule')).pad(this.size);
};

// Logger base method
Logger.prototype.log = function (lvl) {
  var args = (arguments.length > 1) ? slice.call(arguments, 1) : []
    , delim = levelMaps[lvl]('-')
    , level = pad(lvl, max_lvl).toUpperCase();

  if (this.removed.indexOf(lvl) >= 0 || globallyOff.indexOf(lvl) >= 0) {
    return this;
  }

  var ns = this.namespaces.reduce(function (acc, ns) {
    return acc.concat([c.blue(c.bold(pad(ns + '', this.size))), delim]);
  }, []);

   console.log.apply(console, [
    c.grey(new Date().toLocaleTimeString())
  , delim
  , (lvl === 'error') ? c.bold(level) : level
  , delim
  ].concat(ns, args));

  return this;
};


// Public methods

// Return a single Logger helper method
Logger.prototype.get = function (fn) {
  if (levels.indexOf(fn) < 0) {
    this.internal().error('Invalid Logule::get call for non-method: ' + fn);
  }
  else if (this.removed.indexOf(fn) < 0) {
    var that = this
      , l = this.sub();
    // not necessary to suppress l as .get never chains
    // l.suppress.apply(l, $.delete(levels.slice(), fn));

    if (fn === 'line') {
      return function () {
        that.line.apply(l, arguments);
      };
    }
    return function () {
      that.log.apply(l, concat.apply([fn], arguments));
    };
  }
  return noop;
};

// Generate one helper method per specified level
levels.forEach(function (name) {
  if (name !== 'line') {
    Logger.prototype[name] = function () {
      return this.log.apply(this, concat.apply([name], arguments));
    };
  }
});

// Generate line logger
Logger.prototype.line = function () {
  var frame = getStack()[1];
  this.namespaces.push(frame.getFileName() + ":" + frame.getLineNumber());
  var c = this.log.apply(this, concat.apply(['line'], arguments));
  this.namespaces.pop();
  return c;
};

// Set the padding to size s
Logger.prototype.pad = function (s) {
  this.size = s | 0;
  return this;
};

// Suppress logs for specified levels
// Method is cumulative across new subs/gets
Logger.prototype.suppress = function () {
  var fns = arguments.length > 0 ? slice.call(arguments, 0) : []
    , internal = this.internal;

  fns.forEach(function (fn) {
    if (levels.indexOf(fn) < 0) {
      internal().warn('Invalid Logule::suppress call for non-method: ' + fn);
    }
  });
  this.removed = $.union(this.removed, fns);
  return this;
};


// Allow logs for specific levels
// Method is cumulative across new subs/gets
Logger.prototype.allow = function () {
  var fns = (arguments.length > 0) ? slice.call(arguments, 0) : [];
  this.removed = $.difference(this.removed, fns);
  return this;
};

// Subclass from a pre-configured Logger class to get extra namespace(s)
Logger.prototype.sub = function () {
  var sub = construct(Logger, concat.apply(this.namespaces, arguments));
  sub.pad(this.size).suppress.apply(sub, this.removed);
  return sub;
};


// Verify that an instance is an up to date Logger instance
Logger.prototype.verify = function (inst) {
  if (!inst || !inst.version) {
    return false;
  }
  // inst.version only varies by patch number positively
  return semver.satisfies(inst.version, "~" + this.version);
};

// Expose an instance of Logger
module.exports = new Logger();

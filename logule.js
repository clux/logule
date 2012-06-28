var c = require('colors')
  , $ = require('subset')
  , fs = require('fs')
  , path = require('path')
  , semver = require('semver')
  , version = require('./package').version
  , noop = function () {}
  , slice = Array.prototype.slice
  , concat = Array.prototype.concat;

// Levels and their log output delimiter color fn
var levelMaps = {
  zalgo : function (str) {
    return c.magenta(c.zalgo(str));
  }
, error : c.red
, warn  : c.yellow
, info  : c.green
, line  : c.bold
, debug : c.cyan
, trace : c.grey
};
var levels = Object.keys(levelMaps);

// Maximum level length
var max_lvl = Math.max.apply(Math, levels.map(function (l) {
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

// Logger class
var Logger = function () {};

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
  var args = (arguments.length > 1) ? slice.call(arguments, 1) : []
    , delim = levelMaps[lvl]('-')
    , level = pad(lvl, max_lvl).toUpperCase();

  if (this.removed.indexOf(lvl) >= 0 || globallyOff.indexOf(lvl) >= 0) {
    return this;
  }

  var ns = this.namespaces.map(function (n) {
    return c.blue(c.bold(pad(n + '', this.size))) + delim;
  });

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
    this.namespaces.push('logule');
    this.error('Invalid Logule::get call for non-method: ' + fn);
    this.namespaces.pop();
  }
  else if (this.removed.indexOf(fn) < 0) {
    var that = this
      , l = this.sub();

    if (fn === 'line') {
      return function () {
        that.line.apply(l, arguments);
      };
    }
    return function () {
      that._log.apply(l, concat.apply([fn], arguments));
    };
  }
  return noop;
};

// Generate one helper method per specified level
levels.forEach(function (name) {
  if (name !== 'line') {
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

// Set the padding to size s
Logger.prototype.pad = function (s) {
  this.size = s | 0;
  return this;
};

// Suppress logs for specified levels
// Method is cumulative across new subs/gets
Logger.prototype.suppress = function () {
  if (arguments.length) {
    this.removed = $.union(this.removed, slice.call(arguments, 0));
  }
  return this;
};


// Allow logs for specific levels
// Method is cumulative across new subs/gets
Logger.prototype.allow = function () {
  if (arguments.length) {
    this.removed = $.difference(this.removed, slice.call(arguments, 0));
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
  if (!inst || !(inst instanceof Logger)) {
    return false;
  }
  // inst.version only varies by patch number positively
  return semver.satisfies(inst.constructor.prototype.version, "~" + version);
};

// Prevent hacky prototype modifications via l.constructor.prototype
Object.freeze(Logger.prototype);

// Expose a root instance of Logger
module.exports = new Logger();

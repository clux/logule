var c = require('colors')
  , fs = require('fs')
  , path = require('path')
  , semver = require('semver')
  , slice = Array.prototype.slice
  , noop = function () {}
  , version = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version;

// Levels and their log output delimiter color fn
var levelMaps = {
  'error' : c.red
, 'warn'  : c.yellow
, 'info'  : c.green
, 'debug' : c.cyan
, 'trace' : c.grey
, 'zalgo' : c.zalgo
, 'line'  : c.bold
};
var levels = Object.keys(levelMaps);

// Maximum level length
var max_lvl = Math.max.apply({}, levels.map(function (l) {
  return l.length;
}));

// Pads a str to a str of length len
function pad(str, len) {
  if (str.length < len) {
    return str + new Array(len - str.length + 1).join(' ');
  } else {
    return str;
  }
}

// Constructor helper
function construct(Ctor, args) {
  var F = function () {
    Ctor.apply(this, args);
  };
  F.prototype = Ctor.prototype;
  return new F();
}

// Logger class
function Logger() {
  // TODO: ES6 name objects for these so we can move stuff out of Ctor
  var namespaces = (arguments.length > 0) ? slice.call(arguments, 0) : []
    , size = 0
    , removed = []
    , that = this;

  // Expose inspectable info
  this.data = {
    version   : version
  , namespaces: namespaces
  };

  // But dont allow it to be modified
  Object.freeze(this.data);

  // Internal error logger
  // returns a new Logger with one extra namespace, but can log despite filters
  function internal() {
    return construct(Logger, namespaces.concat(['logule'])).pad(size);
  }

  // Logger base method
  function log() {
    var lvl = arguments[0]
      , args = (arguments.length > 1) ? slice.call(arguments, 1) : []
      , delim = levelMaps[lvl]('-')
      , level = pad(lvl, max_lvl).toUpperCase();

    var end = namespaces.reduce(function (acc, ns) {
      return acc.concat([c.blue(c.bold(pad(ns + '', size))), delim]);
    }, []);

    console.log.apply(console, [
      c.grey(new Date().toLocaleTimeString())
    , delim
    , (lvl === 'error') ? c.bold(level) : level
    , delim
    ].concat(end, args));

    return that;
  }

  // Public methods

  // Generate one helper method per specified level
  levels.forEach(function (name) {
    if (name === 'line') {
      return;
    }
    that[name] = function () {
      var args = (arguments.length > 0) ? slice.call(arguments, 0) : [];
      return log.apply(that, [name].concat(args));
    };
  });

  // Generate line logger
  this.line = function () {
    // Get caller file and line number from stack
    var e = new Error().stack.split('\n')[2].split(':')
      , line = e[1]
      , file = (module === require.main) ? 'main' : e[0].split('/').slice(-1)[0];

    namespaces.push(file + ":" + line);
    var c = log.apply(that, ['line'].concat(arguments.length > 0 ? slice.call(arguments, 0) : []));
    namespaces.pop();
    return c;
  };

  // Set the padding to size s
  this.pad = function (s) {
    size = s | 0;
    return that;
  };

  // Suppress logs for specified levels
  // Method is cumulative across subs/gets
  this.suppress = function () {
    var fns = (arguments.length > 0) ? slice.call(arguments, 0) : [];

    fns.forEach(function (fn) {
      if (levels.indexOf(fn) < 0) {
        return internal().warn('Invalid Logule::suppress call for non-method: ' + fn);
      }
      that[fn] = function () {
        return that;
      };
    });

    removed = removed.concat(fns).filter(function (e, i, ary) {
      return ary.indexOf(e, i + 1) < 0;
    });

    return that;
  };

  // Subclass from a pre-configured Logger class to get extra namespace(s)
  this.sub = function () {
    var subns = (arguments.length > 0) ? slice.call(arguments, 0) : [];
    return construct(Logger, namespaces.concat(subns)).pad(size).suppress.apply({}, removed);
  };

  // Return a single Logger helper method
  this.get = function (fn) {
    if (levels.indexOf(fn) < 0) {
      internal().error('Invalid Logule::get call for non-method: ' + fn);
    }
    else if (removed.indexOf(fn) < 0) {
      var l = that.sub().suppress.apply({}, levels);

      if (fn === 'line') {
        return function () {
          that.line.apply(l, (arguments.length > 0) ? slice.call(arguments, 0) : []);
        };
      }
      return function () {
        log.apply(l, [fn].concat((arguments.length > 0) ? slice.call(arguments, 0) : []));
      };
    }
    return noop;
  };
}

// Simple Express Middleware Factory
// Inherits from current logger
Logger.prototype.makeMiddleware = function (expressPrefix) {
  var log = this.sub(expressPrefix);

  return function (req, res, next) {
    log.trace(req.method, req.url.toString());
    next();
  };
};

// Verify that an instance is an up to date Logger instance
Logger.prototype.verify = function (inst) {
  if (!inst || !inst.data || !inst.data.version) {
    return false;
  }
  // inst.version only varies by patch number positively
  return semver.satisfies(inst.data.version, "~" + this.data.version);
};

// Expose an instance of Logger
// Limits API to log methods + get, suppress and sub for passing around
module.exports = new Logger();

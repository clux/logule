var Logger, c, construct, fs, levelMaps, levels, max_lvl, pad, semver, version;
var __slice = Array.prototype.slice;

c = require('colors');

fs = require('fs');

semver = require('semver');

levelMaps = {
  'error': c.red,
  'warn': c.yellow,
  'info': c.green,
  'debug': c.cyan,
  'trace': c.grey,
  'zalgo': c.zalgo,
  'line': c.bold
};

levels = Object.keys(levelMaps);

max_lvl = Math.max.apply({}, levels.map(function(l) {
  return l.length;
}));

pad = function(str, len) {
  if (str.length < len) {
    return str + new Array(len - str.length + 1).join(' ');
  } else {
    return str;
  }
};

construct = function(Ctor, args) {
  var F;
  F = function() {
    return Ctor.apply(this, args);
  };
  F.prototype = Ctor.prototype;
  return new F();
};

version = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8')).version;

Logger = function() {
  var internal, log, namespaces, removed, size, that;
  namespaces = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  size = 0;
  removed = [];
  that = this;
  this.data = {
    version: version,
    namespaces: namespaces
  };
  Object.freeze(this.data);
  internal = function() {
    return construct(Logger, namespaces.concat(['logule'])).pad(size);
  };
  log = function() {
    var args, delim, end, level, lvl;
    lvl = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    delim = levelMaps[lvl]('-');
    level = pad(lvl, max_lvl).toUpperCase();
    end = namespaces.reduce(function(acc, ns) {
      return acc.concat([c.blue(c.bold(pad(ns + '', size))), delim]);
    }, []);
    console.log.apply(console, [c.grey(new Date().toLocaleTimeString()), delim, lvl === 'error' ? c.bold(level) : level, delim].concat(end, args));
    return that;
  };
  this.pad = function(s) {
    size = s;
    return that;
  };
  this.suppress = function() {
    var fns;
    fns = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    fns.forEach(function(fn) {
      if (levels.indexOf(fn) < 0) {
        return internal().warn("Invalid function requested to be suppressed - \"" + fn + "\" not a valid logger method");
      } else {
        return that[fn] = function() {
          return that;
        };
      }
    });
    removed = removed.concat(fns).filter(function(e, i, ary) {
      return ary.indexOf(e, i + 1) < 0;
    });
    return that;
  };
  this.sub = function() {
    var subns;
    subns = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return construct(Logger, namespaces.concat(subns)).pad(size).suppress.apply({}, removed);
  };
  this.get = function(fn) {
    var l;
    if (levels.indexOf(fn) < 0) {
      internal().error("Invalid function requested to Logule::get - \"" + fn + "\" not a valid logger method");
      return (function() {});
    }
    if (removed.indexOf(fn) >= 0) return (function() {});
    l = that.sub();
    l.suppress.apply({}, levels);
    if (fn === 'line') {
      return function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        that.line.apply(l, args);
      };
    }
    return function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      log.apply(l, [fn].concat(args));
    };
  };
  levels.forEach(function(name) {
    if (name === 'line') return;
    return that[name] = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return log.apply(that, [name].concat(args));
    };
  });
  this.line = function() {
    var args, e, file, line, res;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    e = new Error().stack.split('\n')[2].split(':');
    line = e[1];
    file = module === require.main ? 'main' : e[0].split('/').slice(-1)[0];
    namespaces.push(file + ":" + line);
    res = log.apply(that, ['line'].concat(args));
    namespaces.pop();
    return res;
  };
};

Logger.prototype.makeMiddleware = function() {
  var log;
  log = this.sub('EXPRESS');
  return function(req, res, next) {
    log.trace(req.method, req.url.toString());
    return next();
  };
};

Logger.prototype.verify = function(inst) {
  var _ref;
  if (!((_ref = inst.data) != null ? _ref.version : void 0)) return false;
  return semver.satisfies(inst.data.version, "~" + this.data.version);
};

module.exports = new Logger();

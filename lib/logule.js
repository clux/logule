var set = require('subset')
  , format = require('util').format
  , noop = require('autonomy').noop
  , cfg = require('./configure')
  , col = cfg.colors
  , slice = Array.prototype.slice
  , moduleMaps = {};

// Logger class
function Logger(id, isMain) {
  this.id = id;
  this.isMain = isMain;
}

// prototype defaults
var proto = {
  removed : [],
  namespaces : [],
  id : '.'
};

// make undeletable instance defaults at the bottom of the prototype chain
Object.keys(proto).forEach(function (key) {
  Object.defineProperty(Logger.prototype, key, {
    value : proto[key],
    writable : false,
    enumerable : false,
    configurable : false
  });
});


// When muting/unmuting, make sure the changes inherit
Logger.prototype._sync = function () {
  if (this.isMain) {
    moduleMaps[this.id].removed = this.removed.slice();
  }
};


// The actual functions writing to stdout/file or emitting 'log' events
var toStdout = function (lvl, msg, ns) {
  var output = cfg.nsFormat(ns);
  output.unshift(col.levels[lvl]);

  var ts = cfg.timestamp();
  if (ts) {
    output.unshift(col.timestamp(ts));
  }

  if (lvl === 'line') {
    output.push(col.callsite(cfg.line()));
  }
  if (msg !== '') {
    output.push(col.msg[lvl](msg));
  }
  process.stdout.write(output.join(col.delim[lvl]) + '\n');
};

var toEmitter = function (lvl, msg, ns) {
  cfg.emitter.emit('log', {
    time : new Date(),
    level: lvl,
    namespaces : ns,
    line : (lvl === 'line') ? cfg.line() : null,
    message : msg
  });
};

var toFile = function (lvl, msg, ns) {
  cfg.filestream.write(JSON.stringify({
    time : cfg.filestamp(),
    level : lvl,
    namespaces : ns,
    line : (lvl === 'line') ? cfg.line() : null,
    message : msg
  }) + '\n');
};

var usingMute = cfg.stdoutmutable ||
  (cfg.emitter && cfg.emitmutable) ||
  (cfg.filestream && cfg.filemutable);

// One log method per level
cfg.levels.forEach(function (lvl) {
  var soutLvl = (cfg.suppressed.indexOf(lvl) < 0)
    , emitLvl = (cfg.emitter && cfg.emitsuppressed.indexOf(lvl) < 0)
    , fileLvl = (cfg.filestream && cfg.filesuppressed.indexOf(lvl) < 0);
  // if suppressed/disabled, never log, so cache these checks


  Logger.prototype[lvl] = function () {
    var args = format.apply(null, arguments)
      , isMuted = (usingMute && this.removed.indexOf(lvl) >= 0);

    if (soutLvl && (!cfg.stdoutmutable || !isMuted)) {
      toStdout(lvl, args, this.namespaces);
    }
    if (emitLvl && (!cfg.emitmutable || !isMuted)) {
      toEmitter(lvl, args, this.namespaces.slice());
    }
    if (fileLvl && (!cfg.filemutable || !isMuted)) {
      toFile(lvl, args, this.namespaces);
    }
    return this;
  };
});

/**
 * Public methods
 *
 * convenience log methods:
 *   `info`, `warn`, `error`, `debug`, `trace`, `line`, `zalgo`
 *
 * mute control methods:
 *   `mute`, `unmute`, `muteOnly`, `unmuteOnly`
 *
 * safe method/instance duplicators:
 *   `get`, `sub`
 *
 * entry-point/module registration:
 *    `init`
 **/


// Get a log method copy inheriting the current relevant instance settings
Logger.prototype.get = function (fn, ns) {
  if (cfg.levels.indexOf(fn) < 0) {
    this.sub('logule').error("log.get() called with non-method:", fn);
    return noop;
  }
  var sub = this.sub(ns ? String(ns) : undefined);
  return function () {
    sub[fn].apply(sub, arguments);
  };
};

// Get an instance copy inheriting settings/mutes/namespaces
Logger.prototype.sub = function () {
  var sub = Object.create(this);
  sub.namespaces = this.namespaces.concat(slice.call(arguments));
  sub.isMain = false;
  return sub;
};

// Mute logs for specified levels
Logger.prototype.mute = function () {
  this.removed = set.union(this.removed, slice.call(arguments));
  this._sync();
  return this;
};

// Unmute logs for specific levels (cannot override global suppression)
Logger.prototype.unmute = function () {
  this.removed = set.difference(this.removed, slice.call(arguments));
  this._sync();
  return this;
};

// Mute only (levels \ args)
Logger.prototype.unmuteOnly = function () {
  this.removed = set.difference(cfg.levels, slice.call(arguments));
  this._sync();
  return this;
};

// Mute only args
Logger.prototype.muteOnly = function () {
  this.removed = slice.call(arguments);
  this._sync();
  return this;
};

// Prevent leaky prototype hacks via l.constructor.prototype
Object.freeze(Logger.prototype);

// entry point
exports.init = function (parent, moduleName) {
  if (!parent || !parent.id) {
    (new Logger('logule')).error(".init() needs the `module` object");
    return null;
  }
  var log = new Logger(parent.id, true);

  // loop up the call tree to find previously used parameters
  // best when graph == tree, else original parent is retrieved due to module caching
  for (var m = parent; m ; m = m.parent) {
    if (moduleMaps[m.id]) {
      log.namespaces = moduleMaps[m.id].namespaces.slice();
      log.removed = moduleMaps[m.id].removed.slice();
      break;
    }
  }
  if (moduleName) {
    log.namespaces.push(String(moduleName));
  }
  // communication API (frozen)
  moduleMaps[parent.id] = {
    namespaces  : log.namespaces.slice(),
    removed     : log.removed.slice()
  };

  return log;
};

if (cfg.emitter) {
  exports.emitter = cfg.emitter;
}

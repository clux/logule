var set = require('subset')
  , format = require('util').format
  , noop = require('autonomy').noop
  , cfg = require('./configure')
  , zalgify = require('dye').zalgo
  , basename = require('path').basename
  , slice = Array.prototype.slice;

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
function Logger(id, isMain) {
  this.id = id;
  this.isMain = isMain;
}

// prototype defaults
var proto = {
  removed : []
, namespaces : []
, id : '.'
};

// make undeletable instance defaults at the bottom of the prototype chain
Object.keys(proto).forEach(function (key) {
  Object.defineProperty(Logger.prototype, key, {
    value : proto[key]
  , writable : false
  , enumerable : false
  , configurable : false
  });
});

// store a process specific variable for logule to communicate across different copies
if (!process.logule) {
  process.logule = {};
}
var moduleMaps = process.logule;

// When muting/unmuting, make sure the changes inherit
Logger.prototype._sync = function () {
  if (this.isMain) {
    moduleMaps[this.id].removed = this.removed.slice();
  }
};

// Main logger function
Logger.prototype._log = function (lvl, msg) {
  if (this.removed.indexOf(lvl) >= 0 || cfg.globallyOff.indexOf(lvl) >= 0) {
    return this;
  }
  var date = cfg.getDate()
    , ns = this.namespaces.map(cfg.formatNamespace).slice(0, cfg.nesting)
    , outputArray = [cfg.levelMap[lvl]].concat(ns);

  if (msg !== '') {
    outputArray.push(msg);
  }
  if (date) {
    outputArray.unshift(cfg.dateCol(date));
  }

  console.log.call(console, outputArray.join(cfg.delimMap[lvl]));

  if (cfg.fileStream) {
    cfg.fileStream.write(JSON.stringify({
      date : date
    , level : lvl
    , namespaces : this.namespaces
    , message : msg
    }) + '\n');
  }
  return this;
};

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

// One log method per level
set.difference(cfg.levels, ['line', 'zalgo']).forEach(function (lvl) {
  Logger.prototype[lvl] = function () {
    return this._log(lvl, format.apply(this, arguments));
  };
});

// Generate line and zalgo separately
Logger.prototype.line = function () {
  var frame = getStack()[1];
  var loc = basename(frame.getFileName()) + ':' + frame.getLineNumber();
  var msg = arguments.length ? cfg.delimMap.line + format.apply(this, arguments) : '';
  return this._log('line', cfg.lineCol(loc) + msg);
};
Logger.prototype.zalgo = function () {
  return this._log('zalgo', zalgify(format.apply(this, arguments)));
};

// Get a log method copy inheriting the current relevant instance settings
Logger.prototype.get = function (fn) {
  if (cfg.levels.indexOf(fn) < 0) {
    this.sub('logule').error("log.get() called with non-method:", fn);
  }
  else if (this.removed.indexOf(fn) < 0 && cfg.globallyOff.indexOf(fn) < 0) {
    // return proper fn if not muted and not suppressed
    var sub = this.sub();
    return function () {
      sub[fn].apply(sub, arguments);
    };
  }
  return noop;
};

// Get an instance copy inheriting current settings, but maintains own mutes + namespaces
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

// Prevent hacky prototype modifications via l.constructor.prototype
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
    log.namespaces.push(moduleName);
  }
  // communication API (frozen)
  moduleMaps[parent.id] = {
    namespaces  : log.namespaces.slice()
  , removed     : log.removed.slice()
  };

  return log;
};

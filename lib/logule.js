var set = require('subset')
  , util = require('util')
  , $ = require('autonomy')
  , cfg = require('./configure')
  , zalgify = require('colors').zalgo
  , basename = require('path').basename
  , slice = Array.prototype.slice
  , concat = Array.prototype.concat;

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
      $.extend(log, moduleMaps[m.id]);
      break;
    }
  }
  if (moduleName) {
    log.namespaces.push(moduleName);
  }
  // communication API is frozen:
  moduleMaps[parent.id] = {
    namespaces  : log.namespaces
  , removed     : log.removed
  };

  return log;
};

// Logger base method
Logger.prototype._log = function (lvl) {
  if (this.removed.indexOf(lvl) >= 0 || cfg.globallyOff.indexOf(lvl) >= 0) {
    return this;
  }
  var args = arguments.length > 1 ? slice.call(arguments, 1) : []
    , date = cfg.getDate()
    , msg = util.format.apply(this, args)
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

// Public methods

// Generate one helper method per specified level
set.difference(cfg.levels, ['line', 'zalgo']).forEach(function (lvl) {
  Logger.prototype[lvl] = function () {
    return this._log.apply(this, concat.apply([lvl], arguments));
  };
});

// Generate line and zalgo separately
Logger.prototype.line = function () {
  var frame = getStack()[1];
  var loc = basename(frame.getFileName()) + ':' + frame.getLineNumber();
  this._log.apply(this, concat.apply(['line',  cfg.lineCol(loc)], arguments));
  return this;
};

Logger.prototype.zalgo = function () {
  var msg = zalgify(util.format.apply(this, arguments));
  this._log.apply(this, ['zalgo', msg]);
  return this;
};

// Return a single Logger helper method
Logger.prototype.get = function (fn) {
  if (cfg.levels.indexOf(fn) < 0) {
    this.sub('logule').error("log.get() called with non-method", fn);
  }
  else if (this.removed.indexOf(fn) >= 0 || cfg.globallyOff.indexOf(fn) >= 0) {
    // level was muted locally or globally, result would just be an expensive noop
    return $.noop;
  }
  var sub = this.sub();
  return function () {
    sub[fn].apply(sub, arguments);
  };
};

// When muting/unmuting, make sure the changes inherit
Logger.prototype._sync = function () {
  if (this.isMain) {
    moduleMaps[this.id].removed = this.removed.slice();
  }
};
// Mute logs for specified levels
Logger.prototype.mute = function () {
  if (arguments.length) {
    this.removed = set.union(this.removed, slice.call(arguments, 0));
    this._sync();
  }
  return this;
};

// Unmute logs for specific levels (cannot override global suppression)
Logger.prototype.unmute = function () {
  if (arguments.length) {
    this.removed = set.difference(this.removed, slice.call(arguments, 0));
    this._sync();
  }
  return this;
};

// Mute only (levels \ args)
Logger.prototype.unmuteOnly = function () {
  this.removed = set.difference(cfg.levels, slice.call(arguments, 0));
  this._sync();
  return this;
};

// Mute only args
Logger.prototype.muteOnly = function () {
  this.removed = slice.call(arguments, 0);
  this._sync();
  return this;
};

// Subclass from a pre-configured Logger class to get extra namespace(s)
Logger.prototype.sub = function () {
  var sub = Object.create(this);
  sub.namespaces = concat.apply(this.namespaces, arguments);
  sub.isMain = false;
  return sub;
};

// Prevent hacky prototype modifications via l.constructor.prototype
Object.freeze(Logger.prototype);

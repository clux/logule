var set = require('subset')
  , util = require('util')
  , $ = require('autonomy')
  , cfg = require('./configure')
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

// store `module` maps locally as multiple require('logule') calls are cached
// TODO: globalize to communicate with _physically_ different copies of logule?
var moduleMaps = {};
exports.init = function (parent, moduleName) {
  if (!parent || !parent.id) {
    var fail = new Logger('logule');
    fail.error("invalid logule usage - .init() needs the modules `module` object");
    return null;
  }
  var log = new Logger(parent.id, true);

  // loop up the call graph to find previously used parameters
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
  moduleMaps[parent.id] = {
    namespaces  : log.namespaces
  , removed     : log.removed
  };

  return log;
};

// Logger base method
Logger.prototype._log = function (lvl) {
  var args = arguments.length > 1 ? slice.call(arguments, 1) : [];

  if (this.removed.indexOf(lvl) >= 0 || cfg.globallyOff.indexOf(lvl) >= 0) {
    return this;
  }

  var date = cfg.getDate()
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
cfg.levels.forEach(function (name) {
  if (name !== 'line' && name !== '_log') {
    Logger.prototype[name] = function () {
      return this._log.apply(this, concat.apply([name], arguments));
    };
  }
});

// Generate line logger separately
Logger.prototype.line = function () {
  var frame = getStack()[1];
  var loc = basename(frame.getFileName()) + ':' + frame.getLineNumber();
  this._log.apply(this, concat.apply(['line',  cfg.lineCol(loc)], arguments));
  return this;
};

// Return a single Logger helper method
Logger.prototype.get = function (fn) {
  if (cfg.levels.indexOf(fn) < 0) {
    this.namespaces.push('logule');
    this.error('Invalid Logule::get call for non-method: ' + fn);
    this.namespaces.pop();
  }
  else if (this.removed.indexOf(fn) >= 0 || cfg.globallyOff.indexOf(fn) >= 0) {
    // level was suppressed locally or globally, result would just be an expensive noop
    return $.noop;
  }

  var self = this
    , sub = this.sub();

  if (fn === 'line') {
    return function () {
      self.line.apply(sub, arguments);
    };
  }
  return function () {
    self._log.apply(sub, concat.apply([fn], arguments));
  };
};

// Suppress logs for specified levels
// affects this logger and new loggers inheriting from parent call graph
Logger.prototype.suppress = function () {
  if (arguments.length) {
    this.removed = set.union(this.removed, slice.call(arguments, 0));
    // ensure subs / new inits cannot use these functions either
    if (this.isMain) {
      moduleMaps[this.id].removed = this.removed.slice();
    }
  }
  return this;
};

// Allow logs for specific levels for this logger only (does not override global suppresses)
// affects this logger and new loggers inheriting from parent call graph
Logger.prototype.allow = function () {
  if (arguments.length) {
    this.removed = set.difference(this.removed, slice.call(arguments, 0));
    // allow subs / new inits to use these functions as well
    if (this.isMain) {
      moduleMaps[this.id].removed = this.removed.slice();
    }
  }
  return this;
};

// Subclass from a pre-configured Logger class to get extra namespace(s)
// Since module level sub already called, this is for same module subs only now
Logger.prototype.sub = function () {
  var sub = Object.create(this);
  sub.namespaces = concat.apply(this.namespaces, arguments);
  sub.isMain = false;
  return sub;
};

// Prevent hacky prototype modifications via l.constructor.prototype
Object.freeze(Logger.prototype);

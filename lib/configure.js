var fs = require('fs')
  , path = require('path')
  , c = require('colors')
  , set = require('subset')
  , $ = require('autonomy')
  , defaults = require('../.logule')
  , fallback = require('path').dirname(module.parent.filename)
  , custom = require('confortable')('.logule', process.cwd(), fallback);

fs.existsSync || (fs.existsSync = path.existsSync);
var exists = function (file) {
  return fs.existsSync(file) && !fs.statSync(file).isDirectory();
};

var rawCfg = (custom) ? require(custom) : {};

//  ensure levels are always the ones defined in the defaults
var levObj = Object.keys(rawCfg.levels || {}).reduce(function (acc, key) {
  if (key in defaults.levels) {
    acc[key] = rawCfg.levels[key];
  }
  else {
    console.error("cannot introduce new methods in " + custom);
  }
  return acc;
}, defaults.levels);

// remaining cfg elements can be read from after a merge
var cfg = $.extend(defaults, rawCfg);

// misc colors
var prefixCol = c[cfg.prefixCol];
var dateCol = c[cfg.dateCol];
var lineCol = c[cfg.lineCol];
if (!(prefixCol instanceof Function)) {
  console.error("invalid color function for prefixCol found in " + custom);
}
if (!(dateCol instanceof Function)) {
  console.error("invalid color function for dateCol found in " + custom);
}
if (!(lineCol instanceof Function)) {
  console.error("invalid color function for lineCol found in " + custom);
}

// prepad a number with zeroes so that it's n characters long
var prep = function (numb, n) {
  return ("000" + numb).slice(-n); // works for n <= 3
};

// highly customizable, and efficient date formatting shortcut for _log
var f = cfg.formatting;

var getDate = $.noop;
if (f.dateType === 'precision') {
  getDate = function () {
    var d = new Date();
    return d.toLocaleTimeString() + '.' + prep(d.getMilliseconds(), 3);
  };
}
else if (f.dateType === 'none') {
  getDate = $.noop;
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

// cache color calls in delimMap/levelMap for _log
var levels = Object.keys(levObj);
var max_lvl = set.maximum($.pluck('length', levels));

// Pads a str to a str of length len
var pad = function (str, len) {
  return (str.length < len) ? str + new Array(len - str.length + 1).join(' ') : str;
};

// exports
exports.levels = levels;
exports.delimMap = levels.reduce(function (acc, lvl) {
  var fn = c[levObj[lvl]];
  if (!(fn instanceof Function)) {
    console.error("invalid color function for level '" + lvl + "' found in " + custom);
  }
  acc[lvl] = fn(cfg.delimiter);
  return acc;
}, {});

exports.levelMap = levels.reduce(function (acc, lvl) {
  var padded = pad(lvl.toUpperCase(), max_lvl);
  acc[lvl] = (cfg.bold.indexOf(lvl) >= 0) ? c.bold(padded) : padded;
  return acc;
}, {});

exports.getDate = getDate;
exports.dateCol = dateCol;
exports.lineCol = lineCol;

// applies cfg.pad (for el zero iff set) and cfg.prefixCol
var padding = cfg.pad | 0;
exports.formatNamespace = function (n, i) {
  n = (i === 0) ? pad(n + '', padding) : n;
  return prefixCol(c.bold(n));
};

if (cfg.logFile) {
  var logPath = path.join(path.dirname(custom), cfg.logFile);
  exports.fileStream = fs.createWriteStream(logPath, {flags: 'a'});
}

exports.nesting = cfg.nesting | 0;

exports.globallyOff = (cfg.useAllow) ? set.difference(levels, cfg.allow) : cfg.suppress;

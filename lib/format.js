var util = require('util');
/**
 * This fork only adds two cases to format %o and %O
 * %o for zero level recurse depth (overview of first keys only)
 * %O for one level deep (get contents of first keys as well if objects)
 *
 * For one, I'm not sure these are the best identifiers, secondly; lineInspect is
 * way too too simplistic at the moment. Have to remove whitespace and newlines added
 * by `util` which unhelpfully does not provide an option to insert it in the first
 * place, even though it does it at the end.
 *
 * I've tried several regexes for repeat whitespace to be replaced with a single:
 * - noRepeatWhiteSpace: /s+/g
 * - multiWhiteSpaceNotInQuotes = /\s+(?=([^']*'[^']*')*[^']*$)/g;
 *
 * The first truncates inside strings, and the second relies on there being an even
 * number of single quotes which is false if one of the strings in the object contain
 * a single escaped quote.
 *
 * I don't want to fork the entire `util` module for this so must find a better way.
 * Maybe ask node guys to make an option for this.
 */

var multiWhiteSpaceNotInQuotes = /\s+(?=([^']*'[^']*')*[^']*$)/g;
var lineInspect = function (o, depth) {
  return util.inspect(o, {depth: depth}).replace(multiWhiteSpaceNotInQuotes, ' ');
};

// util.format with 2 extra cases
var formatRegExp = /%[sdjoO%]/g;
module.exports = function (f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i += 1) {
      objects.push(util.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var j = 1
    , args = arguments
    , len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (j >= len) return x;
    switch (x) {
      case '%s': return String(args[j++]);
      case '%d': return Number(args[j++]);
      case '%j': return JSON.stringify(args[j++]);
      case '%o': return lineInspect(args[j++], 0);
      case '%O': return lineInspect(args[j++], 1);
      default:
        return x;
    }
  });
  for (var x = args[j]; j < len; x = args[++j]) {
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + util.inspect(x); // uses the formatted 2 recurse level default
    }
  }
  return str;
};

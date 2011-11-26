c = require('colors')

# Log levels
levelMaps =
  'error' : c.red
  'warn'  : c.yellow
  'info'  : c.green
  'debug' : c.cyan
  'trace' : c.grey
  'zalgo' : c.zalgo

levels = Object.keys(levelMaps)

# Max level length
max_lvl = Math.max.apply({}, levels.map((l) -> l.length))

# Pads str to a str of length len
pad = (str, len) ->
  if str.length < len then str + new Array(len - str.length + 1).join(' ') else str

# Constructor helper
construct = (Ctor, args) ->
  F = -> Ctor.apply(@, args)
  F:: = Ctor::
  new F()

# Logger Class
Logger = (namespaces...) ->
  # TODO.ES6? use name objects for these 3 so that everything in constructor style can be avoided
  size = 0
  removed = []
  that = @

  # Internal error logger
  # returns a new Logger with same namespaces+1, but ignores current filters
  internal = ->
    construct(Logger, namespaces.concat(['logule'])).pad(size)

  # Log base method
  # chains if it was not obtained via @get
  log = (lvl, single, args...) ->
    delim = levelMaps[lvl]('-')
    level = pad(lvl, max_lvl).toUpperCase()

    end = namespaces.reduce((acc, ns) ->
      acc.concat [
        c.blue c.bold pad(ns+'', size)
        delim
      ]
    , [])

    console.log.apply console, [
      c.grey new Date().toLocaleTimeString()
      delim
      if lvl is 'error' then c.bold level else level
      delim
    ].concat(end, args)
    return if single
    that

  #
  # Public methods
  #

  # Set the padding size
  @pad = (s) ->
    size = s
    that

  # Suppress - sanitizes this Logger instance hiding outputs to disallowed fns
  # Method is cumulative across subs
  @suppress = (fns...) ->
    fns.forEach (fn) ->
      if levels.indexOf(fn) < 0
        internal().warn("Invalid function requested to be suppressed - \"#{fn}\" not a valid logger method")
      else
        that[fn] = -> that

    removed = removed.concat(fns).filter (e, i, ary) ->
      ary.indexOf(e, i+1) < 0 # removed should remain unique at all times

    that

  # Subclass from a pre-configured Logger class to get an extra namespace
  @sub = (subns...) ->
    construct(Logger, namespaces.concat(subns)).pad(size).suppress.apply({}, removed)

  # Return a single Logger helper method
  @get = (fn) ->
    if levels.indexOf(fn) < 0
      internal().error("Invalid function requested to Logule::get - \"#{fn}\" not a valid logger method")
      return (->)

    return (->) if removed.indexOf(fn) >= 0 # dont allow @get to resurrect suppressed fns

    l = that.sub()
    l.suppress.apply({}, levels) # suppress all
    (args...) -> log.apply(l, [fn, true].concat(args))

  # Generate one shortcut method per level
  levels.forEach (name) ->
    that[name] = (args...) ->
      log.apply(that, [name, false].concat(args))

  return

# Expose an instance of Logger
# Limits API to log methods + get, suppress and sub for passing around
module.exports = new Logger()

# Quick test
if module is require.main and false
  size = 15
  log = new Logger('EVENTS', 'CONNECTION').pad(size)
  log.suppress('warn','error').warn('should not work').debug('but log chains')

  log = new Logger('CONNECTION').pad(size)
  sublog = log.sub('ESTABLISHMENT')
  sublog.warn('works')
  log.suppress('warn')
  log.warn('wont work1')
  log = log.sub('REMOVAL')
  log.warn('wont work2').trace('tracer test')


  zalgo = log.get('zalgo')
  zalgo("zalgo", 23432, 234)

  log = new Logger()
  log.error('this is very bad').zalgo('he comes').info('try xhtml')

# Logger
# Adapted from socket.io-node's logger
c = require('colors')


# arguments helper
toArray = (enu) ->
  e for e in enu

# Log levels
levelMaps =
  'error' : c.red
  'warn'  : c.yellow
  'info'  : c.green
  'debug' : c.cyan
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
Logger = (@namespaces...) ->

# Set Padding Size
Logger::pad = (@size = 0) -> @

# Subclass from a pre-configured Logger class to get an extra namespace
Logger::sub = (subns...) ->
  construct(Logger, @namespaces.concat(subns)).pad(@size)

# Log base method
Logger::log = (lvl) ->
  delim = levelMaps[lvl]('-')
  level = pad(lvl, max_lvl).toUpperCase()

  end = @namespaces.reduce((acc, ns) ->
    acc.concat [
      c.blue c.bold pad(ns+'', @size)
      delim
    ]
  , [])

  console.log.apply console, [
    c.grey new Date().toLocaleTimeString()
    delim
    if lvl is 'error' then c.bold level else level
    delim
  ].concat(end, toArray(arguments)[1...])
  @

# Returns a sanitized Logger instance hiding outputs to disallowed fns
Logger::remove = (disallowed...) ->
  #TODO: make sure log is not in disallowed
  l = construct(Logger, @namespaces).pad(@size)
  disallowed.forEach (fnstr) ->
    l[fnstr] = -> l
  l

# Return a single Logger helper method
Logger::get = (fnstr) ->
  #TODO: make sure fnstr is legal
  => @[fnstr].apply(@, arguments)

# Generate one shortcut method per level
levels.forEach (name) ->
  Logger::[name] = ->
    @log.apply(@, [name].concat(toArray(arguments)))

# Expose Logger
module.exports = Logger

# Quick test
if module is require.main
  size = 15
  log = new Logger('EVENTS', 'CONNECTION').pad(size)
  log.remove('warn','error').info('wee').warn('should not work').debug('should work') # returned clone ignores warning messages
  log.error('this is very bad').warn('this could be bad').info('standard message').debug('irrelephant message')
  log = new Logger('CONNECTION').pad(size)
  sublog = log.sub('ESTABLISHMENT', 'FINALIZING')
  sublog.warn('works?')


  zalgo = log.get('zalgo')
  zalgo("zalgotest!", 23432, 234)

  log = new Logger()
  log.error('this is very bad').warn('this could be bad').zalgo('he comes').info('try xhtml')



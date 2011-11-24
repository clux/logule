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

# Logger Class
Logger = (@namespaces...) ->

# Set Padding Size
Logger::pad = (@size = 0) -> @

# Log method
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

Logger::remove = (disallowed...) ->
  disallowed.forEach (fnstr) =>
    @[fnstr] = ->
  @

Logger::get = (fnstr) ->
  =>
    @[fnstr].apply(@, arguments)

# Generate one shortcut method per level
levels.forEach (name) ->
  Logger::[name] = ->
    @log.apply(@, [name].concat(toArray(arguments)))

# Expose Logger
module.exports = Logger

# Quick test
if module is require.main
  size = 0
  log = new Logger('EVENTS', 'CONNECTION').pad(size)
  log.error('this is very bad').warn('this could be bad').info('standard message').debug('irrelephant message')
  log = new Logger('CONNECTION').pad(size)
  zalgo = log.get('zalgo')
  zalgo("zalgotest!", 23432, 234)

  log = new Logger()
  log.error('this is very bad').warn('this could be bad').zalgo('he comes').info('try xhtml')



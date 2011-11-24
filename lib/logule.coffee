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
Logger = (@prefix, @size = 0) ->

# Log method
Logger::log = (lvl) ->
  @delim = levelMaps[lvl]('-')
  level = pad(lvl, max_lvl).toUpperCase()
  end = if @prefix then [c.blue(c.bold(pad(@prefix, @size))), @delim] else []

  console.log.apply console, [
    c.grey new Date().toLocaleTimeString()
    @delim
    if lvl is 'error' then c.bold level else level
    @delim
  ].concat(end, toArray(arguments)[1...])
  @

# Generate one shortcut method per level
levels.forEach (name) ->
  Logger::[name] = ->
    @log.apply(@, [name].concat(toArray(arguments)))

# Expose Logger
module.exports = Logger

# Quick test
if module is require.main
  size = 10
  log = new Logger('logger', size)
  log.error('this is very bad').warn('this could be bad').info('standard message').debug('irrelephant message')
  log = new Logger('deathmatch', size)
  dbg = -> log.debug.apply(log, arguments)
  dbg("arst", {}, 324324, new Date())
  log = new Logger()
  log.error('this is very bad').warn('this could be bad').zalgo('he comes').info('try xhtml')


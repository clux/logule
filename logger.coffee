# Logger
# Adapted from socket.io-node's logger
c = require('colors')


# arguments helper
toArray = (enu) ->
  e for e in enu

# Log levels
levels = [
  'error'
  'warn'
  'info'
  'debug'
]

# Colors for log levels
colors = [
  c.red
  c.yellow
  c.green
  c.cyan
]

# Count from levels
max = Math.max.apply({}, levels.map((l) -> l.length))
num = levels.length

# Pads the nice output to the longest log level
pad = (str, len) ->
  if str.length < len then str + new Array(len - str.length + 1).join(' ') else str

# Public API

# Logger Class
Logger = (@prefix, @size = 2) ->

# Log method
Logger::log = (type) ->
  index = levels.indexOf(type)
  return @ if index >= num
  type = pad(type, max).toUpperCase()

  @delim = colors[index]('-')
  end = if @prefix then [c.blue(c.bold(pad(@prefix, @size))), @delim] else []
  #console.log @size, @prefix.length, @prefix

  console.log.apply console, [
    c.grey new Date().toLocaleTimeString()
    @delim
    if type is 'error' then c.bold type else type
    @delim
  ].concat(end).concat(toArray(arguments)[1...])
  @

# Generate methods
levels.forEach (name) ->
  Logger::[name] = ->
    @log.apply(@, [name].concat(toArray(arguments)))

module.exports = Logger

# Quick test
if module is require.main
  log = new Logger('prefix')
  log.error("this is an error message")
  log.warn("warning").info("info msg").debug("chained debug")


  #size = 10
  #log = new Logger('logger', size)
  #log.error('this is very bad').warn('this could be bad').info('standard message').debug('irrelephant message')
  #log = new Logger('deathmatch', size)
  #log.error('this is very bad').warn('this could be bad').info('standard message').debug('irrelephant message')
  #d = -> log.debug.apply(log, arguments)
  #d("arst")
  #log = new Logger()
  #log.error('this is very bad').warn('this could be bad').info('standard message').debug('irrelephant message')


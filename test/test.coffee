logule    = require('../')
assert    = require 'assert'

levels = ['trace','debug','info','warn','error','zalgo']

l = logule.sub('suppressed')
l.suppress.apply({}, levels)
log = logule.sub('LOGULE', 'TEST').get('info')

exports["test chaining"] = ->
  for lvl in levels
    assert.equal(l, l[lvl](1), "l.#{lvl} chains")
  log 'chaining - completed:', levels.length

privates = ['internal', 'log' ]

exports["test encapsulation"] = ->
  for priv in privates
    assert.isUndefined(l[priv], "l.#{priv} is encapsulated")
  log 'encapsulation - completed:', privates.length

public = ['get', 'suppress', 'sub', 'pad', 'makeMiddleware']

exports["test exports"] = ->
  for p in public
    assert.isDefined(l[p], "l.#{p} is exported")
    assert.type(l[p], 'function', "l.#{p} is function")
  testCount = 2*public.length

  for lvl in levels
    fn = l.get(lvl)
    assert.type(fn, 'function', "l.get('#{lvl}') returns a function")
    assert.isUndefined(fn(), "l.get('#{lvl}')() returns undefined")
    testCount += 2

  expectedExports = levels.concat(public)
  for exprt of l
    assert.ok(expectedExports.indexOf(exprt) >= 0, "l exported key #{exprt} is either a log convenience or one of the public functions")
    testCount += 1

  log "exports - completed:", testCount


# stdout monkey-patch
hook = (cb) ->
  write = process.stdout.write
  replacement = (stub) ->
    (string, encoding, fd) ->
      # hide output in test
      #stub.apply(process.stdout, arguments)
      cb(string, encoding, fd)

  process.stdout.write = replacement(process.stdout.write)

  # undo damage fn returned
  -> process.stdout.write = write

testMsg = "this is a test message"

exports["test stdout"] = ->
  testCount = 0
  stdlog = logule.sub('STDOUT')
  saved = ""
  unhook = hook (str, enc, fd) ->
    saved = str

  for lvl in levels
    stdlog[lvl](testMsg)
    assert.includes(saved, lvl.toUpperCase(), "captured stdlog contains correct log type")
    assert.includes(saved, testMsg, "captured stdlog contains input message")
    testCount += 2


  unhook()
  log "stdout - completed", testCount

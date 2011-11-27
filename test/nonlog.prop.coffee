logule    = require('../')
assert    = require 'assert'

levels = ['zalgo','info','warn','error','trace','debug']

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


exports["test output"] = ->
  #sin = process.openStdin()
  #sin.on 'data', (line) ->
  #  console.log "got line", line
  #console.log("test line")
  return

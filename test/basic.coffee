logule    = require('../')
assert    = require 'assert'

levels = ['trace','debug','info','warn','error','zalgo', 'line']

l = logule.sub('suppressed')
l.suppress.apply({}, levels)
log = logule.sub('LOGULE').get('info')

exports["test chaining"] = -> #TODO: logule chains, but not l? wtf
  for lvl in levels
    assert.equal(l, l[lvl](1), "l.#{lvl} chains")
    assert.isUndefined(l.get(lvl)(1), "l.get('#{lvl}') does not chain")

    sub = l.sub('wee')
    assert.equal(sub.info('wat'), sub, "sub chains")
    single = sub.get(lvl)
    assert.isUndefined(single('wat'), "sub single returns undefined")


  log 'chaining - completed:', 4*levels.length

privates = ['internal', 'log', 'namespaces', 'size', 'removed']

exports["test encapsulation"] = ->
  for priv in privates
    assert.isUndefined(l[priv], "l.#{priv} is encapsulated")
  log 'encapsulation - completed:', privates.length

public = ['get', 'suppress', 'sub', 'pad', 'makeMiddleware', 'verify', 'data']

exports["test exports"] = ->
  for p in public when p isnt 'data'
    assert.isDefined(l[p], "l.#{p} is exported")
    assert.type(l[p], 'function', "l.#{p} is function")

  assert.isDefined(l.data, "l.data is exported")
  assert.isDefined(l.data.version, "l.data.version is exported")
  assert.isDefined(l.data.namespaces, "l.data.namespaces is exported")

  testCount = 2*public.length-2 + 3

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


exports["test verify"] = ->
  assert.ok(logule.verify(logule), "logule.verify(logule) is logule")
  assert.ok(!(logule.verify(logule.get('info'))), "logule.verify(logule.get('info')) is false")
  assert.ok(logule.sub('arst').verify(logule), "logule.sub('arst').verify(logule) is true")
  assert.ok(logule.verify(logule.sub('arst')), "logule.verify(logule.sub('arst')) is true")


  assert.ok(logule.verify(l), "logule.verify(l)")
  assert.ok(logule.verify(l.sub('arst')), "logule.verify(l.sub('arst'))")
  assert.ok(l.verify(logule), "l.verify(logule)")
  assert.ok(l.sub('arst').verify(logule), "l.sub('arst').verify(logule)")

  testCount = 8

  for lvl in levels
    assert.ok(l.get(lvl) instanceof Function, "l.get('#{lvl}') returns a function")
    testCount += 1

  log "exports - completed:", testCount


exports["test sub"] = ->
  assert.ok(logule is logule, "obvious test")
  assert.ok(logule isnt logule.sub(), "logule.sub() does not return this")
  log 'sub - completed', 2

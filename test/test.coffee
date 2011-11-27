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

exports["test sub"] = ->
  assert.ok(logule is logule, "obvious test")
  assert.ok(logule isnt logule.sub(), "logule.sub() does not return this")
  log 'sub - completed', 2


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
  output = []
  unhook = hook (str, enc, fd) ->
    output.push str

  last = -> output[output.length-1]

  # output from all shortcut methods is sensible
  for lvl in levels
    oldsize = output.length
    stdlog[lvl](testMsg)
    assert.includes(last(), lvl.toUpperCase(), "captured stdlog contains correct log type")
    assert.includes(last(), testMsg, "captured stdlog contains input message")
    assert.includes(last(), "STDOUT", "captured stdlog contains namespace")
    assert.equal(oldsize+1, output.length, "hook pushed a str onto the output array")
    testCount += 4

  # output from get(lvl) functions is sensible
  for lvl in levels
    stdlog.sub('GOTTEN').get(lvl)(testMsg)
    assert.includes(last(), testMsg, "stdlog.get('#{lvl}') logged the message")
    assert.includes(last(), lvl.toUpperCase(), "stdlog.get('#{lvl}') preserves log level correctly")
    assert.includes(last(), 'STDOUT', "stdlog.get('#{lvl}') preserves namespace1")
    assert.includes(last(), 'GOTTEN', "stdlog.get('#{lvl}') preserves namespace2")
    testCount += 4

  stdlog.info('storing previous message')
  assert.includes(last(), "storing previous message", "storing works before testing suppressed functions")
  oldmsg = last()
  testCount += 1

  # suppressed methods do not send to stdout
  for lvl in levels
    stdsub = stdlog.sub().suppress(lvl)
    single = stdsub.get(lvl)
    stdsub[lvl](testMsg)
    assert.equal(oldmsg, last(), "suppressed logger function does not send to stdout")
    single(testMsg)
    assert.equal(oldmsg, last(), "suppressed logger single function does not send to stdout")

    testCount += 2

  # subs of suppressed do not send to stdout
  for lvl in levels
    stdsub = stdlog.sub('THIS_DIES').suppress(lvl)
    stdsub.sub('SUBSUB')[lvl](testMsg)
    assert.equal(oldmsg, last(), "sub().#{lvl} does not send to stdout when parent was suppressed")
    stdsub.sub('SUBSUB').get(lvl)(testMsg)
    assert.equal(oldmsg, last(), "sub().get('#{lvl}') does not send to stdout when parent was suppressed")

    testCount += 2

  # suppressing a level does not affect other levels
  for lvl in levels
    stdsub = stdlog.sub('SEMI').suppress(lvl)
    # via normal approach
    for lvl2 in levels when lvl2 isnt lvl
      oldsize = output.length
      stdsub[lvl2](testMsg)
      assert.includes(last(), "SEMI", "semi suppressed logger outputs when #{lvl2} not suppressed")
      assert.includes(last(), testMsg, "semi suppressed logger outputs when #{lvl2} not suppressed")
      assert.includes(last(), lvl2.toUpperCase(), "semi suppressed logger does indeed output as the log level matches #{lvl2}")
      assert.equal(oldsize+1, output.length, "hook pushed a str onto the output array (semi suppress)")
      testCount += 4
    # via get
    for lvl2 in levels when lvl2 isnt lvl
      oldsize = output.length
      stdsub.get(lvl2)(testMsg)
      assert.includes(last(), "SEMI", "semi suppressed logger outputs when #{lvl2} not suppressed")
      assert.includes(last(), testMsg, "semi suppressed logger single outputs when #{lvl2} not suppressed")
      assert.includes(last(), lvl2.toUpperCase(), "semi suppressed logger single does indeed output as the log level matches #{lvl2}")
      assert.equal(oldsize+1, output.length, "hook pushed a str onto the output array (semi suppress single)")
      testCount += 4
    # nor does it affect future subs
    for lvl2 in levels when lvl2 isnt lvl
      oldsize = output.length
      stdsub.sub('subSemi')[lvl2](testMsg)
      assert.includes(last(), "SEMI", "semi suppressed logger sub outputs when #{lvl2} not suppressed")
      assert.includes(last(), "subSemi", "semi suppressed logger sub outputs when #{lvl2} not suppressed")
      assert.includes(last(), testMsg, "semi suppressed logger single outputs when #{lvl2} not suppressed")
      assert.includes(last(), lvl2.toUpperCase(), "semi suppressed logger does indeed output as the log level matches #{lvl2}")
      assert.equal(oldsize+1, output.length, "hook pushed a str onto the output array (semi suppress sub)")
      testCount += 5
    # nor future subs' singles
    for lvl2 in levels when lvl2 isnt lvl
      oldsize = output.length
      stdsub.sub('subSemi').get(lvl2)(testMsg)
      assert.includes(last(), "SEMI", "semi suppressed logger sub single outputs when #{lvl2} not suppressed")
      assert.includes(last(), "subSemi", "semi suppressed logger sub single outputs when #{lvl2} not suppressed")
      assert.includes(last(), testMsg, "semi suppressed logger sub single outputs when #{lvl2} not suppressed")
      assert.includes(last(), lvl2.toUpperCase(), "semi suppressed logger sub single does indeed output as the log level matches #{lvl2}")
      assert.equal(oldsize+1, output.length, "hook pushed a str onto the output array (semi suppress sub single)")
      testCount += 5

  # chaining works even when things are suppressed
  for lvl in levels when lvl isnt 'info'
    stdsub = stdlog.sub('chainer').suppress(lvl)
    oldsize = output.length
    stdsub[lvl]('suppressed message').info('working message')[lvl]('another suppressed')
    assert.equal(oldsize+1, output.length, "hook pushed a str onto the output array (chained 3 calls but 2 suppressed)")
    assert.includes(last(), 'working message', "chaining message for #{lvl} onto suppressed info does log what we want")
    testCount += 2

  # multi output
  for lvl in levels
    stdsub.sub('multi')[lvl](testMsg, 160000, 'WOWZA', {})
    assert.includes(last(), testMsg, "multi argument message to #{lvl} contains argument 1")
    assert.includes(last(), 160000, "multi argument message to #{lvl} contains argument 2")
    assert.includes(last(), "WOWZA", "multi argument message to #{lvl} contains argument 3")
    assert.includes(last(), "{}", "multi argument message to #{lvl} contains argument 4")
    testCount += 4

  # multi output single
  for lvl in levels
    stdsub.sub('multi').get(lvl)(testMsg, 160000, 'WOWZA', {})
    assert.includes(last(), testMsg, "multi argument message to #{lvl} contains argument 1")
    assert.includes(last(), 160000, "multi argument message to #{lvl} contains argument 2")
    assert.includes(last(), "WOWZA", "multi argument message to #{lvl} contains argument 3")
    assert.includes(last(), "{}", "multi argument message to #{lvl} contains argument 4")
    testCount += 4

  unhook()
  log "stdout - completed", testCount

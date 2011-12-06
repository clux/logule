coffee  = require 'coffee-script'
fs      = require 'fs'

files = ['index']

task 'compile', 'coffee compile source', ->
  for file in files
    out = fs.readFileSync('./src/'+file+'.coffee', 'utf8')
    fs.writeFileSync('./lib/'+file+'.js', coffee.compile(out, {bare:true}))

  return

{spawn, exec} = require 'child_process'

option '-p', '--prefix [DIR]', 'set the installation prefix for `cake install`'

task 'build', 'continually build autodoccs with --watch', ->
  coffee = spawn 'coffee', ['-cw', 'autodoccs.coffee']
  coffee.stdout.on 'data', (data) -> console.log data.toString().trim()

task 'docs', 'rebuild the autodoccs documentation', ->
  exec([
    'docco autodoccs.coffee'
    'sed "s/docco.css/resources\\/docco.css/" < docs/autodoccs.html > index.html'
    'rm -r docs'
  ].join(' && '), (err) ->
    throw err if err
  )
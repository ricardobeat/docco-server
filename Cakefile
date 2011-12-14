{spawn, exec} = require 'child_process'

option '-p', '--prefix [DIR]', 'set the installation prefix for `cake install`'

task 'build', 'continually build autodoccs with --watch', ->
  coffee = spawn 'coffee', ['-cw', 'docco-server.coffee']
  coffee.stdout.on 'data', (data) -> console.log data.toString().trim()

task 'docs', 'rebuild the documentation', ->
  exec([
    'docco docco-server.coffee'
    'sed "s/docco.css/resources\\/docco.css/" < docs/docco-server.html > index.html'
    'rm -r docs'
  ].join(' && '), (err) ->
    throw err if err
  )
#!/usr/bin/env node
'use strict'

const spawn = require('react-dev-utils/crossSpawn')

let script = process.argv[2]
const args = process.argv.slice(3)

if (script === 'bootstrap') {
  script = 'create'
}

switch (script) {
  case 'build':
  case 'start':
  case 'create':
  case 'test':
    // eslint-disable-next-line no-case-declarations
    const result = spawn.sync(
      'node',
      [require.resolve('../scripts/' + script)].concat(args),
      { stdio: 'inherit' },
    )

    if (result.signal) {
      if (result.signal === 'SIGKILL') {
        console.log(
          'The build failed because the process exited too early. ' +
          'This probably means the system ran out of memory or someone called ' +
          '`kill -9` on the process.',
        )
      } else if (result.signal === 'SIGTERM') {
        console.log(
          'The build failed because the process exited too early. ' +
          'Someone might have called `kill` or `killall`, or the system could ' +
          'be shutting down.',
        )
      }
      process.exit(1)
    }

    process.exit(result.status)
  default:
    console.log('Unknown script "' + script + '".')
    console.log('Perhaps you need to update frontend?')
    break
}

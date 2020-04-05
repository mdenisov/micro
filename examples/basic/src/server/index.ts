import * as http from 'http'

import './env'

let currentHandler = require('./server').default.callback()
const server = http.createServer(currentHandler)

server
  .listen(process.env.PORT || 3000, () => {
    console.log('🚀  Started\n')
  })
  .on('error', error => {
    console.log(error)
  })

if (module.hot) {
  console.log('✅  Server-side HMR Enabled!')

  module.hot.accept('./server', () => {
    console.log('🔁  HMR Reloading `./server`...')

    try {
      const newHandler = require('./server').default.callback()

      server.removeListener('request', currentHandler)
      server.on('request', newHandler)

      currentHandler = newHandler
    } catch (error) {
      console.error(error)
    }
  })
}

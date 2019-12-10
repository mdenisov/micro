import http from 'http'

import app from './server'

const server = http.createServer(app)

let currentApp = app

server
  .listen(process.env.PORT || 3000, () => {
    console.log('🚀  Started')
  })
  .on('error', error => {
    console.log(error)
  })

if (module.hot) {
  console.log('✅  Server-side HMR Enabled!')

  module.hot.accept('./server', () => {
    console.log('🔁  HMR Reloading `./server`...')

    try {
      app = require('./server').default

      server.removeListener('request', currentApp)
      server.on('request', app)

      currentApp = app
    } catch (error) {
      console.error(error)
    }
  })
}

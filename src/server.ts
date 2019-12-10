import * as http from 'http'
// import Loadable from 'react-loadable';

import app from './server/index'

let currentHandler = app.callback()

const server = http.createServer(currentHandler)

// Loadable.preloadAll().then(() =>
server
  .listen(process.env.PORT || 3000, () => {
    console.log('🚀 started')
  })
  .on('error', error => {
    console.log(error)
  })
// );

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

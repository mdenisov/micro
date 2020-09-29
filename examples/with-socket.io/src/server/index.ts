import http from 'http'
import SocketIO from 'socket.io'

import app from './server'
import ioHandler from './socket'

const port = process.env.PORT || 3000

let server
let io

const start = (newApp, newIoHandler) => {
  server = http.createServer(newApp.callback())
  io = SocketIO(server, {
    pingTimeout: 60 * 1000,
    pingInterval: 10 * 1000,
  })

  newIoHandler(io)

  server.listen(port, (error) => {
    if (error) {
      throw error
    }

    console.log(`🚀  Started on ${port}`)
  })
}

const stop = (cb) => {
  if (!server) {
    return cb()
  }

  io.close((err) => {
    if (err) {
      console.error(err.message)
    }

    server = null
    io = null

    return cb()
  })
}

const restart = (newApp, newIoHandler) => stop(() => {
  start(newApp, newIoHandler)
})

if (module.hot) {
  console.log('✅  Server-side HMR Enabled!')

  module.hot.accept(['./server', './socket'], () => {
    console.log('🔁  HMR Reloading...')

    const newApp = require('./server').default
    const newIoHandler = require('./socket').default

    restart(newApp, newIoHandler)
  })
}

start(app, ioHandler)

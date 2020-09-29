import * as React from 'react'
import { Route, Switch } from 'react-router-dom'
import io from 'socket.io-client'

import './App.css'
import Home from './Home'

const App = () => {
  const socket = React.useRef(null)

  React.useEffect(() => {
    socket.current = io(`http://localhost:${process.env.PORT}`, {
      timeout: 60 * 1000,
      forceNew: true,
      transports: ['websocket'],
    })
  }, [])

  return (
    <Switch>
      <Route exact path="/" component={Home}/>
    </Switch>
  )
}

export default App

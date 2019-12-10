import * as React from 'react'
import { Helmet } from 'react-helmet'

// @ts-ignore
import logo from './react.svg'
import './Home.css'

function Home() {
  return (
    <div className="App">
      <Helmet>
        <title>Welcome to Frontend</title>
      </Helmet>

      <header className="App-header">
        <img src={ logo } className="App-logo" alt="logo"/>
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  )
}

export default Home

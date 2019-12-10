import { BrowserRouter } from 'react-router-dom'
import * as React from 'react'
import { hydrate } from 'react-dom'
import Loadable from 'react-loadable'

import App from './app/App'

const root = document.getElementById('root')

// if (module.hot) {
//   module.hot.accept('./App', () => {
//     const NewApp = require('./App').default;
//
//     render(NewApp);
//   });
// }

function render(Root: React.ComponentType) {
  // Load all components needed before rendering

  Loadable.preloadReady().then(() => {
    hydrate(
      <BrowserRouter>
        <Root/>
      </BrowserRouter>,
      root,
    )
  })
}

render(App)

// for dev tools
// window.React = React;

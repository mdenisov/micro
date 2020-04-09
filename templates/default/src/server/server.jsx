import * as React from 'react'
import { StaticRouter } from 'react-router-dom'
import * as express from 'express'
import { renderToString } from 'react-dom/server'

import App from '../client/App'

const assets = require(process.env.ASSETS_MANIFEST)

const server = express()
server
  .disable('x-powered-by')
  .use(express.static(process.env.PUBLIC_DIR))
  .get('/*', (req, res) => {
    const context = {}
    const markup = renderToString(
      <StaticRouter context={context} location={req.url}>
        <App/>
      </StaticRouter>,
    )

    if (context.url) {
      res.redirect(context.url)
    } else {
      res.status(200).send(`<!doctype html>
<html lang="">
  <head>
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta charset="utf-8" />
    <title>Welcome to Frontend</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${
      assets.bundle.css
        ? `<link rel="stylesheet" href="${assets.bundle.css}">`
        : ''
    }
    ${
      process.env.NODE_ENV === 'production'
        ? `<script src="${assets.bundle.js}" defer></script>`
        : `<script src="${assets.bundle.js}" defer crossorigin></script>`
    }
  </head>
  <body>
      <div id="root">${markup}</div>
  </body>
</html>`,
      )
    }
  })

export default server

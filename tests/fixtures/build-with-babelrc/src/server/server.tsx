import Koa from 'koa'
import serve from 'koa-static'
import compress from 'koa-compress'
import React from 'react'
import { StaticRouter } from 'react-router-dom'
import { renderToString } from 'react-dom/server'

import App from '../client/App'

const assets = require(process.env.ASSETS_MANIFEST as string)

const server = new Koa()

server.use(async (ctx: Koa.Context, next: () => Promise<any>) => {
  const start = Date.now()

  await next()

  console.log('REQUEST', ctx.method, ctx.url, ctx.status, Date.now() - start, 'ms')
})
server.use(compress())
server.use(serve(process.env.PUBLIC_DIR as string))
server.use((ctx: Koa.Context) => {
  const context: { url?: string } = {}
  const markup = renderToString(
    <StaticRouter context={context} location={ctx.url}>
      <App />
    </StaticRouter>,
  )

  if (context.url) {
    ctx.redirect(context.url)
  } else {
    ctx.status = 200
    ctx.body = `<!doctype html>
<html lang="">
<head>
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta charset="utf-8" />
<title>Welcome to Micro</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
${
  assets.bundle.css
    ? `<link rel="stylesheet" href="${assets.bundle.css}">`
    : ''
}

${
  process.env.NODE_ENV === 'production'
    ? `<script src="${assets.bundle.js}" async></script>`
    : `<script src="${assets.bundle.js}" async crossorigin></script>`
}
</head>
<body>
  <div id="root">${markup}</div>
</body>
</html>`
  }
})

export default server

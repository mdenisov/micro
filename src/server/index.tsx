import Koa from 'koa'
import serve from 'koa-static'
import { renderToString } from 'react-dom/server'
import * as React from 'react'
import { StaticRouter } from 'react-router-dom'

import App from '../app/App'

const app = new Koa()

app.use(serve(process.env.PUBLIC_DIR as string, { maxage: 24 * 60 * 60 * 1000 }))
app.use(async (ctx: Koa.Context) => {
  const context: { url?: string } = {}
  // const modules: string[] = [];
  const markup = renderToString(
    // <Capture report={moduleName => modules.push(moduleName)}>
    <StaticRouter context={ context } location={ ctx.url }>
      <App/>
    </StaticRouter>,
    // </Capture>
  )

  if (context.url) {
    ctx.redirect(context.url)
  } else {
    // const bundles = getBundles(stats, modules);
    // const styles = bundles.filter(bundle => bundle.file.endsWith('.css'));
    // const scripts = bundles.filter(bundle => bundle.file.endsWith('.js'));
    // const helmet = Helmet.renderStatic();

    ctx.type = 'html'
    ctx.status = 200
    // ctx.body = minify(renderer({ assets, styles, scripts, helmet, markup }), minifyOptions);
    ctx.body = markup
  }
})

export default app

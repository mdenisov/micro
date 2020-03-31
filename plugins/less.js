const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const postCssOptions = require('./postCss')

module.exports = (defaultConfig, { target, dev }, webpack, userOptions = {}) => {
  const isServer = target !== 'web'

  const config = Object.assign({}, defaultConfig)
  const lessLoader = {
    loader: require.resolve('less-loader'),
    options: {
      javascriptEnabled: true,
    },
  }
  const styleLoader = {
    loader: dev
      ? require.resolve('style-loader')
      : MiniCssExtractPlugin.loader,
  }
  const postcssLoader = {
    loader: require.resolve('postcss-loader'),
    options: postCssOptions,
  }

  config.module.rules.push({
    test: /\.(less|css)/,
    use: [
      styleLoader, // creates style nodes from JS strings or extract
      require.resolve('css-loader'), // translates CSS into CommonJS
      postcssLoader, // normalize CSS,
      lessLoader, // compiles Less to CSS
    ],
  })

  return config
}

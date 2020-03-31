const { ReactLoadablePlugin } = require('react-loadable/webpack')

module.exports = {
  modify: (defaultConfig, { target }) => {
    const config = Object.assign({}, defaultConfig)

    if (target === 'web') {
      config.plugins.push(
        new ReactLoadablePlugin({
          filename: './build/react-loadable.json',
        })
      )
    }

    return config
  },
}

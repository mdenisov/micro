// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development'
process.env.NODE_ENV = 'development'

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err
})

const chalk = require('react-dev-utils/chalk')

const openBrowser = require('react-dev-utils/openBrowser')
const clearConsole = require('react-dev-utils/clearConsole')
const setPorts = require('razzle-dev-utils/setPorts')

const fs = require('fs-extra')
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')

const paths = require('../config/paths')
const configFactory = require('../config/createConfig')

process.noDeprecation = true // turns off that loadQuery clutter.

const isInteractive = process.stdout.isTTY

// Tools like Cloud9 rely on this.
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000
const HOST = process.env.HOST || '0.0.0.0'

// Webpack compile in a try-catch
function compile(config) {
  let compiler
  try {
    compiler = webpack(config)
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
  return compiler
}

setPorts()
  .then(() => {
    // Remove all content but keep the directory so that
    // if you're in it, you don't end up in Trash
    fs.emptyDirSync(paths.appBuild)

    // Optimistically, we make the console look exactly like the output of our
    // FriendlyErrorsPlugin during compilation, so the user has immediate feedback.
    clearConsole()
    console.log(
      chalk.cyan('Compiling...'),
    )
    let razzle = {}

    // Check for razzle.config.js file
    if (fs.existsSync(paths.appRazzleConfig)) {
      try {
        razzle = require(paths.appRazzleConfig)
      } catch (err) {
        clearConsole()
        console.log(
          chalk.cyan('Invalid razzle.config.js file.'),
          err,
        )
        process.exit(1)
      }
    }

    // Create dev configs using our config factory, passing in razzle file as options.
    const clientConfig = configFactory('web', 'dev', razzle, webpack)
    const serverConfig = configFactory('node', 'dev', razzle, webpack)

    // Compile our assets with webpack
    const clientCompiler = compile(clientConfig)
    const serverCompiler = compile(serverConfig)

    // Instatiate a variable to track server watching
    let watching

    // Start our server webpack instance in watch mode after assets compile
    clientCompiler.plugin('done', () => {
      // If we've already started the server watcher, bail early.
      if (watching) {
        return
      }
      // Otherwise, create a new watcher for our server code.
      watching = serverCompiler.watch(
        {
          noInfo: true,
          quiet: false,
          stats: 'none',
        },
        /* eslint-disable no-unused-vars */
        stats => {
        },
      )
    })

    // Create a new instance of Webpack-dev-server for our client assets.
    // This will actually run on a different port than the users app.
    const devServer = new WebpackDevServer(clientCompiler, clientConfig.devServer)

    // Launch WebpackDevServer.
    devServer.listen((DEFAULT_PORT + 1) || 3001, HOST, err => {
      if (err) {
        return console.log(err)
      }

      if (isInteractive) {
        clearConsole()
      }

      openBrowser(`http://localhost:${DEFAULT_PORT}`)
    });

    ['SIGINT', 'SIGTERM'].forEach(function (sig) {
      process.on(sig, function () {
        devServer.close()
        process.exit()
      })
    })
  })
  .catch(err => {
    if (err && err.message) {
      console.log(err.message)
    }
    process.exit(1)
  })

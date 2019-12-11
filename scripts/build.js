#! /usr/bin/env node
'use strict'
// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'production'
process.env.NODE_ENV = 'production'

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err
})

// Ensure environment variables are read.
require('../config/env')

const chalk = require('react-dev-utils/chalk')
const clearConsole = require('react-dev-utils/clearConsole')
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages')
const FileSizeReporter = require('react-dev-utils/FileSizeReporter')

const webpack = require('webpack')
const fs = require('fs-extra')

const paths = require('../config/paths')
const configFactory = require('../config/createConfig')

const measureFileSizesBeforeBuild = FileSizeReporter.measureFileSizesBeforeBuild
const printFileSizesAfterBuild = FileSizeReporter.printFileSizesAfterBuild

// First, read the current file sizes in build directory.
// This lets us display how much they changed later.
measureFileSizesBeforeBuild(paths.appBuildPublic)
  .then(previousFileSizes => {
    // Remove all content but keep the directory so that
    // if you're in it, you don't end up in Trash
    fs.emptyDirSync(paths.appBuild)

    // Merge with the public folder
    copyPublicFolder()

    // Start the webpack build
    return build(previousFileSizes)
  })
  .then(
    ({ stats, previousFileSizes, warnings }) => {
      if (warnings.length) {
        console.log(chalk.yellow('Compiled with warnings.\n'))
        console.log(warnings.join('\n\n'))
        console.log(
          '\nSearch for the ' +
          chalk.underline(chalk.yellow('keywords')) +
          ' to learn more about each warning.',
        )
        console.log(
          'To ignore, add ' +
          chalk.cyan('// eslint-disable-next-line') +
          ' to the line before.\n',
        )
      } else {
        console.log(chalk.green('Compiled successfully.\n'))
      }
      console.log('File sizes after gzip:\n')
      printFileSizesAfterBuild(stats, previousFileSizes, paths.appBuild)
      console.log()
    },
    err => {
      console.log(chalk.red('Failed to compile.\n'))
      console.log((err.message || err) + '\n')
      process.exit(1)
    },
  )

function build(previousFileSizes) {
  // Check if frontend.config.js exists
  let frontendConfig = {}

  try {
    frontendConfig = require(paths.appFrontendConfig)
  } catch (e) {}

  clearConsole()

  // Create our production webpack configurations and pass in frontend options.
  const clientConfig = configFactory('web', 'prod', frontendConfig, webpack)
  const serverConfig = configFactory('node', 'prod', frontendConfig, webpack)

  process.noDeprecation = true // turns off that loadQuery clutter.

  console.log(
    chalk.cyan('Creating an optimized production build...'),
  )
  console.log(
    chalk.cyan('Compiling client...'),
  )

  // First compile the client. We need it to properly output assets.json (asset
  // manifest file with the correct hashes on file names BEFORE we can start
  // the server compiler.
  return new Promise((resolve, reject) => {
    compile(clientConfig, (err, clientStats) => {
      if (err) {
        reject(err)
      }

      clearConsole()

      const clientMessages = formatWebpackMessages(
        clientStats.toJson({}, true),
      )

      if (clientMessages.errors.length) {
        return reject(new Error(clientMessages.errors.join('\n\n')))
      }

      console.log(
        chalk.cyan('Compiled client successfully.'),
      )
      console.log(
        chalk.cyan('Compiling server...'),
      )

      compile(serverConfig, (err, serverStats) => {
        if (err) {
          reject(err)
        }

        const serverMessages = formatWebpackMessages(
          serverStats.toJson({}, true),
        )

        if (serverMessages.errors.length) {
          return reject(new Error(serverMessages.errors.join('\n\n')))
        }

        console.log(
          chalk.cyan('Compiled server successfully.'),
        )

        clearConsole()

        return resolve({
          stats: clientStats,
          previousFileSizes,
          warnings: Object.assign(
            {},
            clientMessages.warnings,
            serverMessages.warnings,
          ),
        })
      })
    })
  })
}

// Helper function to copy public directory to build/public
function copyPublicFolder() {
  fs.copySync(paths.appPublic, paths.appBuildPublic, {
    dereference: true,
    filter: file => file !== paths.appHtml,
  })
}

// Wrap webpack compile in a try catch.
function compile(config, cb) {
  let compiler

  try {
    compiler = webpack(config)
  } catch (err) {
    console.log(err.message)
    process.exit(1)
  }

  compiler.run((err, stats) => {
    cb(err, stats)
  })
}

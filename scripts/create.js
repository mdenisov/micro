#! /usr/bin/env node

'use strict'

const chalk = require('react-dev-utils/chalk')
const program = require('commander')

const messages = require('../utils/messages')
const createApp = require('../utils/createApp')
const pkg = require('../package.json')

let projectName

program
  .version(pkg.version)
  .arguments('<project-directory>')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .action(function (name) {
    projectName = name
  })
  .option('-e, --example <example-path>', messages.exampleHelp())
  .allowUnknownOption()
  .on('--help', messages.help)
  .parse(process.argv)

const example = program.example

createApp({
  projectName,
  example,
})

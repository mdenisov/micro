'use strict'

const path = require('path')
const fs = require('fs')

const copyDir = require('./copy-dir')
const install = require('./install')
const messages = require('./messages')

module.exports = function createApp(opts) {
  const projectName = opts.projectName

  if (!projectName) {
    console.log(messages.missingProjectName())
    process.exit(1)
  }

  if (fs.existsSync(projectName)) {
    console.log(messages.alreadyExists(projectName))
    process.exit(1)
  }

  const projectPath = (opts.projectPath = process.cwd() + '/' + projectName)
  const templatePath = path.resolve(__dirname, '../templates/default')

  copyDir({
    templatePath: templatePath,
    projectPath: projectPath,
    projectName: projectName,
  })
    .then(installWithMessageFactory(opts))
    .catch(function (err) {
      throw err
    })
}

function installWithMessageFactory(opts, isExample = false) {
  const projectName = opts.projectName
  const projectPath = opts.projectPath

  return function installWithMessage() {
    return install({
      projectName: projectName,
      projectPath: projectPath,
      packages: isExample
        ? ['frontend']
        : ['react', 'react-dom', 'react-router-dom', 'create-frontend', 'express'],
    })
      .then(function () {
        console.log(messages.start(projectName))
      })
      .catch(function (err) {
        throw err
      })
  }
}

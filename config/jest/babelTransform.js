'use strict'

const babelJest = require('babel-jest')
const fs = require('fs-extra')

const paths = require('../paths')
const preset = require('../babel')

const hasBabelRc = fs.existsSync(paths.appBabelRc)

const config = {
  presets: !hasBabelRc && preset().presets,
  babelrc: !!hasBabelRc,
}

module.exports = babelJest.createTransformer(config)

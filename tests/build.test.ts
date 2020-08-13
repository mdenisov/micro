import * as shell from 'shelljs'

import * as utils from './utils'

shell.config.silent = false

const stageName = 'stage-build'

describe('build', () => {
  it('should compile files into a build directory', () => {
    utils.setupStageWithFixture(stageName, 'build-default')

    const output = shell.exec('yarn build')

    // Create asset manifest
    expect(shell.test('-f', 'build/assets.json')).toBeTruthy()

    // Create server.js
    expect(shell.test('-f', 'build/server.js')).toBeTruthy()
    expect(shell.test('-f', 'build/server.js.map')).toBeTruthy()

    // Should copy static assets from src/public directory
    expect(shell.test('-f', 'build/public/favicon.ico')).toBeTruthy()
    expect(shell.test('-f', 'build/public/manifest.json')).toBeTruthy()

    // Should compile client bundle to js directory
    expect(shell.test('-d', 'build/public/static/js')).toBeTruthy()
    expect(shell.ls('build/public/static/js/bundle.*.js').code).toBe(0)
    expect(shell.ls('build/public/static/js/commons.*.js').code).toBe(0)
    expect(shell.ls('build/public/static/js/runtime.*.js').code).toBe(0)

    // should compile client image assets to media directory
    expect(shell.test('-d', 'build/public/static/media')).toBeTruthy()
    expect(shell.ls('build/public/static/media/react.*.svg').code).toBe(0)

    // should compile client css to css directory
    expect(shell.test('-d', 'build/public/static/css')).toBeTruthy()
    expect(shell.ls('build/public/static/css/bundle.*.css').code).toBe(0)

    expect(output.code).toBe(0)
  })

  afterEach(() => {
    utils.teardownStage(stageName)
  })
})

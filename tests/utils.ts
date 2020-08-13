import * as shell from 'shelljs'
import * as path from 'path'
import * as fs from 'fs-extra'

const rootDir = process.cwd()

export const setupStageWithFixture = (stageName, fixtureName) => {
  const stagePath = path.join(rootDir, stageName)

  fs.copySync(path.join(rootDir, 'tests', 'fixtures', fixtureName), stagePath)
  fs.ensureSymlinkSync(path.join(rootDir, 'node_modules'), path.join(stagePath, 'node_modules'))
  fs.ensureSymlinkSync(path.join(rootDir, 'bin', 'frontend.js'), path.join(stagePath, 'node_modules', '.bin', 'frontend'))

  shell.chmod(755, path.join(stagePath, 'node_modules', '.bin', 'frontend'))
  shell.cd(stagePath)
}

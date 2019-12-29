const path = require('path')
const fs = require('fs')
const URL = require('url')

const moduleFileExtensions = [
  'mjs',
  'ts',
  'tsx',
  'js',
  'jsx',
  'json',
]

const appDirectory = fs.realpathSync(process.cwd())
const resolveApp = relativePath => path.resolve(appDirectory, relativePath)

// Resolve file paths in the same order as webpack
const resolveModule = (resolveFn, filePath) => {
  const extension = moduleFileExtensions.find(extension =>
    fs.existsSync(resolveFn(`${filePath}.${extension}`))
  )

  if (extension) {
    return resolveFn(`${filePath}.${extension}`)
  }

  return resolveFn(`${filePath}.js`)
}

const envPublicUrl = process.env.PUBLIC_URL

function ensureSlash(path, needsSlash) {
  const hasSlash = path.endsWith('/')

  if (hasSlash && !needsSlash) {
    return path.substr(path, path.length - 1)
  } else if (!hasSlash && needsSlash) {
    return `${path}/`
  } else {
    return path
  }
}

const getPublicUrl = appPackageJson =>
  envPublicUrl || require(appPackageJson).homepage

function getServedPath(appPackageJson) {
  const publicUrl = getPublicUrl(appPackageJson)
  const servedUrl = envPublicUrl || (publicUrl ? new URL(publicUrl).pathname : '/')

  return ensureSlash(servedUrl, true)
}

const resolveOwn = relativePath => path.resolve(__dirname, '..', relativePath)

const nodePaths = (process.env.NODE_PATH || '')
  .split(process.platform === 'win32' ? ';' : ':')
  .filter(Boolean)
  .filter(folder => !path.isAbsolute(folder))
  .map(resolveApp)

module.exports = {
  dotenv: resolveApp('.env'),
  appPath: resolveApp('.'),
  appBuild: resolveApp('build'),
  appBuildPublic: resolveApp('build/public'),
  appPublic: resolveApp('public'),
  appNodeModules: resolveApp('node_modules'),
  appSrc: resolveApp('src'),

  appManifest: resolveApp('build/assets.json'),
  appBabelRc: resolveModule(resolveApp, '.babelrc'),
  appFrontendConfig: resolveApp('frontend.config.js'),
  appTsConfig: resolveApp('tsconfig.json'),
  appPackageJson: resolveApp('package.json'),
  appServerIndexJs: resolveModule(resolveApp, 'src/server/index'),
  appClientIndexJs: resolveModule(resolveApp, 'src/client/index'),

  nodePaths: nodePaths,
  ownPath: resolveOwn('.'),
  ownNodeModules: resolveOwn('node_modules'),
  publicUrl: getPublicUrl(resolveApp('package.json')),
  servedPath: getServedPath(resolveApp('package.json')),
}

module.exports.moduleFileExtensions = moduleFileExtensions

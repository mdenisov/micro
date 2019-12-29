const env = process.env.BABEL_ENV || process.env.NODE_ENV
const isProduction = env === 'production'
const isDevelopment = env === 'development'
const isTest = env === 'test'

const presetEnvConfig = {
  // In the test environment `modules` is often needed to be set to true, babel figures that out by itself using the `'auto'` option
  // In production/development this option is set to `false` so that webpack can handle import/export with tree-shaking
  modules: 'auto',
}
const presetReactConfig = {
  development: isDevelopment || isTest,
}
const presetTypescriptConfig = {
  allowNamespaces: true
}
const pluginRuntimeConfig = {
  corejs: 2,
  helpers: true,
  regenerator: true,
}
const pluginRestSpreadConfig = {
  useBuiltIns: true,
}
const pluginCommonjsConfig = {
  loose: true
}

const preset = {
  sourceType: 'unambiguous',
  presets: [
    [require.resolve('@babel/preset-env'), presetEnvConfig],
    [require.resolve('@babel/preset-react'), presetReactConfig],
    [require.resolve('@babel/preset-typescript'), presetTypescriptConfig],
  ],
  plugins: [
    // require.resolve('react-loadable/babel'),

    // class { handleThing = () => { } }
    require.resolve('@babel/plugin-proposal-class-properties'),

    // The following two plugins use Object.assign directly, instead of Babel's
    // extends helper. Note that this assumes `Object.assign` is available.
    [require.resolve('@babel/plugin-proposal-object-rest-spread'), pluginRestSpreadConfig],
    // Adds syntax support for import()
    require.resolve('@babel/plugin-syntax-dynamic-import'),
    // Add support for async/await
    [require.resolve('@babel/plugin-transform-runtime'), pluginRuntimeConfig],
  ],
}

if (env !== 'development' && env !== 'test' && env !== 'production') {
  throw new Error(
    'Using `babel-preset` requires that you specify `NODE_ENV` or ' +
    '`BABEL_ENV` environment variables. Valid values are "development", ' +
    '"test", and "production". Instead, received: ' +
    JSON.stringify(env) +
    '.',
  )
}

if (env === 'development' || env === 'test') {
  preset.plugins.push([
    // Adds component stack to warning messages
    require.resolve('@babel/plugin-transform-react-jsx-source'),
  ])
}

if (env === 'test') {
  preset.plugins.push([
    // Compiles import() to a deferred require()
    require.resolve('babel-plugin-dynamic-import-node'),
    // Transform ES modules to commonjs for Jest support
    [require.resolve('@babel/plugin-transform-modules-commonjs'), pluginCommonjsConfig],
  ])
}

if (env === 'production') {
  preset.plugins.push([
    require.resolve('babel-plugin-transform-react-remove-prop-types'),
  ])
}

module.exports = () => preset

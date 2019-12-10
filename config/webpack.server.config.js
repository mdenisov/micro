const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const resolve = require('resolve')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin')
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin')
const getCSSModuleLocalIdent = require('react-dev-utils/getCSSModuleLocalIdent')
const nodeExternals = require('webpack-node-externals')
const paths = require('./paths')
const modules = require('./modules')
const getClientEnvironment = require('./env')
const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin')
const ForkTsCheckerWebpackPlugin = require('react-dev-utils/ForkTsCheckerWebpackPlugin')
const typescriptFormatter = require('react-dev-utils/typescriptFormatter')
// @remove-on-eject-begin
const eslint = require('eslint')
const getCacheIdentifier = require('react-dev-utils/getCacheIdentifier')
// @remove-on-eject-end
const postcssNormalize = require('postcss-normalize')

const appPackageJson = require(paths.appPackageJson)

// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false'
// Some apps do not need the benefits of saving a web request, so not inlining the chunk
// makes for a smoother build process.
const shouldInlineRuntimeChunk = process.env.INLINE_RUNTIME_CHUNK !== 'false'

const imageInlineSizeLimit = parseInt(
  process.env.IMAGE_INLINE_SIZE_LIMIT || '10000',
)

// Check if TypeScript is setup
const useTypeScript = fs.existsSync(paths.appTsConfig)

const babelPreset = require('./babel')

// style files regexes
const cssRegex = /\.css$/
const cssModuleRegex = /\.module\.css$/
const sassRegex = /\.(scss|sass)$/
const sassModuleRegex = /\.module\.(scss|sass)$/

// This is the production and development configuration.
// It is focused on developer experience, fast rebuilds, and a minimal bundle.
module.exports = function (webpackEnv, userConfig) {
  const isEnvDevelopment = webpackEnv === 'development'
  const isEnvProduction = webpackEnv === 'production'

  // Webpack uses `publicPath` to determine where the app is being served from.
  // It requires a trailing slash, or the file assets will get an incorrect path.
  // In development, we always serve from the root. This makes config easier.
  const publicPath = isEnvProduction
    ? paths.servedPath
    : isEnvDevelopment && '/'
  // Some apps do not use client-side routing with pushState.
  // For these, "homepage" can be set to "." to enable relative asset paths.
  const shouldUseRelativeAssetPaths = publicPath === './'

  // `publicUrl` is just like `publicPath`, but we will provide it to our app
  // as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
  // Omit trailing slash as %PUBLIC_URL%/xyz looks better than %PUBLIC_URL%xyz.
  const publicUrl = isEnvProduction
    ? publicPath.slice(0, -1)
    : isEnvDevelopment && ''
  // Get environment variables to inject into our app.
  const env = getClientEnvironment(publicUrl)

  // common function to get style loaders
  const getStyleLoaders = (cssOptions, preProcessor) => {
    const loaders = [
      isEnvDevelopment && require.resolve('style-loader'),
      isEnvProduction && {
        loader: MiniCssExtractPlugin.loader,
        options: shouldUseRelativeAssetPaths ? { publicPath: '../../' } : {},
      },
      {
        loader: require.resolve('css-loader'),
        options: cssOptions,
      },
      {
        // Options for PostCSS as we reference these options twice
        // Adds vendor prefixing based on your specified browser support in
        // package.json
        loader: require.resolve('postcss-loader'),
        options: {
          // Necessary for external CSS imports to work
          // https://github.com/facebook/create-react-app/issues/2677
          ident: 'postcss',
          plugins: () => [
            require('postcss-flexbugs-fixes'),
            require('postcss-preset-env')({
              autoprefixer: {
                flexbox: 'no-2009',
              },
              stage: 3,
            }),
            // Adds PostCSS Normalize as the reset css with default options,
            // so that it honors browserslist config in package.json
            // which in turn let's users customize the target behavior as per their needs.
            postcssNormalize(),
          ],
          sourceMap: isEnvProduction && shouldUseSourceMap,
        },
      },
    ].filter(Boolean)
    if (preProcessor) {
      loaders.push(
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: isEnvProduction && shouldUseSourceMap,
          },
        },
        {
          loader: require.resolve(preProcessor),
          options: {
            sourceMap: true,
          },
        },
      )
    }
    return loaders
  }

  // First we check to see if the user has a custom .babelrc file, otherwise
  const hasBabelRc = fs.existsSync(paths.appBabelRc)
  const mainBabelOptions = {
    babelrc: true,
    cacheDirectory: true,
    presets: [
      babelPreset,
    ],
  }

  // if (!hasBabelRc) {
  //   mainBabelOptions.presets.push(require.resolve('../babel.js'));
  // }

  // Allow app to override babel options
  // const babelOptions = modifyBabelOptions
  //   ? modifyBabelOptions(mainBabelOptions)
  //   : mainBabelOptions

  const babelOptions = mainBabelOptions

  if (hasBabelRc && babelOptions.babelrc) {
    console.log('Using .babelrc defined in your app root')
  }

  return {
    mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
    // Stop compilation early in production
    // bail: isEnvProduction,
    devtool: false,
    context: process.cwd(),
    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    entry: [
      paths.appServerEntry,
      // We include the app code last so that if there is a runtime error during
      // initialization, it doesn't blow up the WebpackDevServer client, and
      // changing JS code would still trigger a refresh.
    ],
    output: {
      // The build folder.
      path: paths.appBuild,
      // Add /* filename */ comments to generated require()s in the output.
      // pathinfo: isEnvDevelopment,
      // There will be one main bundle, and one file per asynchronous chunk.
      // In development, it does not produce real files.
      filename: 'server.js',
      libraryTarget: 'commonjs2',
      // We inferred the "public path" (such as / or /my-project) from homepage.
      // We use "/" in development.
      publicPath: publicPath,
    },
    optimization: {
      nodeEnv: false,
    },
    resolve: {
      modules: ['node_modules', paths.appNodeModules],
      extensions: ['.mjs', '.jsx', '.js', '.ts', '.tsx', '.json'],
    },
    resolveLoader: {
      modules: [paths.appNodeModules, paths.ownNodeModules],
    },
    module: {
      strictExportPresence: true,
      rules: [
        // Disable require.ensure as it's not a standard language feature.
        // { parser: { requireEnsure: false } },
        // Avoid "require is not defined" errors
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto',
        },
        // Transform ES6 with Babel
        {
          test: /\.(js|jsx|mjs|ts|tsx)$/,
          include: [paths.appSrc],
          use: [
            {
              loader: require.resolve('babel-loader'),
              options: {
                babelrc: babelOptions,
              }
            },
          ],
        },
        {
          test: /\.(ts|tsx)$/,
          use: [
            {
              loader: require.resolve('ts-loader'),
              options: {
                transpileOnly: true,
                experimentalWatchApi: true,
              },
            },
          ],
        },
        {
          exclude: [
            /\.html$/,
            /\.(js|jsx|mjs)$/,
            /\.(ts|tsx)$/,
            /\.(vue)$/,
            /\.(less)$/,
            /\.(re)$/,
            /\.(s?css|sass)$/,
            /\.json$/,
            /\.bmp$/,
            /\.gif$/,
            /\.jpe?g$/,
            /\.png$/,
          ],
          loader: require.resolve('file-loader'),
          options: {
            name: 'static/media/[name].[hash:8].[ext]',
            emitFile: false,
          },
        },
        // "url" loader works like "file" loader except that it embeds assets
        // smaller than specified limit in bytes as data URLs to avoid requests.
        // A missing `test` is equivalent to a match.
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
          loader: require.resolve('url-loader'),
          options: {
            limit: 10000,
            name: 'static/media/[name].[hash:8].[ext]',
            emitFile: false,
          },
        },
        {
          test: /\.css$/,
          exclude: [paths.appBuild, /\.module\.css$/],
          use: [
            {
              loader: require.resolve('css-loader'),
              options: {
                importLoaders: 1,
              },
            },
          ],
        },
        {
          test: /\.module\.css$/,
          exclude: [paths.appBuild],
          use: [
            {
              // on the server we do not need to embed the css and just want the identifier mappings
              // https://github.com/webpack-contrib/css-loader#scope
              // loader: require.resolve('css-loader/locals'),
              loader: require.resolve('css-loader'),
              options: {
                mode: 'local',
                modules: true,
                importLoaders: 1,
                localIdentName: '[path]__[name]___[local]',
              },
            },
          ]
        }
      ],
    },
    plugins: [
      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      // new ModuleNotFoundPlugin(paths.appPath),
      // Makes some environment variables available to the JS code, for example:
      // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
      // It is absolutely essential that NODE_ENV is set to production
      // during a production build.
      // Otherwise React will be compiled in the very slow development mode.
      new webpack.DefinePlugin(env.stringified),
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebook/create-react-app/issues/240
      // isEnvDevelopment && new CaseSensitivePathsPlugin(),
      // If you require a missing module and then `npm install` it, you still have
      // to restart the development server for Webpack to discover it. This plugin
      // makes the discovery automatic so you don't have to restart.
      // See https://github.com/facebook/create-react-app/issues/186
      // isEnvDevelopment &&
      // new WatchMissingNodeModulesPlugin(paths.appNodeModules),
      // TypeScript type checking
      // useTypeScript &&
      // new ForkTsCheckerWebpackPlugin({
      //   typescript: resolve.sync('typescript', {
      //     basedir: paths.appNodeModules,
      //   }),
      //   async: isEnvDevelopment,
      //   useTypescriptIncrementalApi: true,
      //   checkSyntacticErrors: true,
      //   resolveModuleNameModule: process.versions.pnp
      //     ? `${__dirname}/pnpTs.js`
      //     : undefined,
      //   resolveTypeReferenceDirectiveModule: process.versions.pnp
      //     ? `${__dirname}/pnpTs.js`
      //     : undefined,
      //   tsconfig: paths.appTsConfig,
      //   reportFiles: [
      //     '**',
      //     '!**/__tests__/**',
      //     '!**/?(*.)(spec|test).*',
      //   ],
      //   silent: true,
      //   // The formatter is invoked directly in WebpackDevServerUtils during development
      //   formatter: isEnvProduction ? typescriptFormatter : undefined,
      // }),
    ].filter(Boolean),
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
      __console: false,
      __dirname: false,
      __filename: false,
    },
    externals: [
      nodeExternals({
        // whitelist: [
        //   /\.(eot|woff|woff2|ttf|otf)$/,
        //   /\.(svg|png|jpg|jpeg|gif|ico)$/,
        //   /\.(mp4|mp3|ogg|swf|webp)$/,
        //   /\.(css|scss|sass|sss|less)$/,
        // ].filter(x => x),
      }),
    ],
    // Turn off performance processing because we utilize
    // our own hints via the FileSizeReporter
    performance: false,
  }
}

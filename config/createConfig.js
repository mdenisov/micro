const fs = require('fs-extra')
const path = require('path')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const nodeExternals = require('webpack-node-externals')
const AssetsPlugin = require('assets-webpack-plugin')
const StartServerPlugin = require('start-server-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const safePostCssParser = require('postcss-safe-parser')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const WebpackBar = require('webpackbar')
const eslint = require('eslint')

const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware')
const evalSourceMapMiddleware = require('react-dev-utils/evalSourceMapMiddleware')
const ForkTsCheckerWebpackPlugin = require('react-dev-utils/ForkTsCheckerWebpackPlugin')
const typescriptFormatter = require('react-dev-utils/typescriptFormatter')

const runPlugin = require('../utils/runPlugin')
const paths = require('./paths')
const { getClientEnv, nodePath } = require('./env')

// Check if TypeScript is setup
const useTypeScript = fs.existsSync(paths.appTsConfig)

// style files regexes
const cssRegex = /\.css$/
const cssModuleRegex = /\.module\.css$/

const postCssOptions = {
  ident: 'postcss', // https://webpack.js.org/guides/migrating/#complex-options
  plugins: () => [
    require('postcss-flexbugs-fixes'),
    require('postcss-preset-env')({
      autoprefixer: {
        flexbox: 'no-2009',
      },
      stage: 3,
    }),
  ],
}

// This is the Webpack configuration factory. It's the juice!
module.exports = (
  target = 'web',
  env = 'dev',
  {
    clearConsole = true,
    host = 'localhost',
    port = 3000,
    modify,
    plugins,
    modifyBabelOptions,
  },
  webpackObject,
) => {
  // First we check to see if the user has a custom .babelrc file, otherwise
  // we just use babel-preset-frontend.
  const hasBabelRc = fs.existsSync(paths.appBabelRc)
  const mainBabelOptions = {
    babelrc: true,
    cacheDirectory: true,
    presets: [],
  }

  if (!hasBabelRc) {
    mainBabelOptions.presets.push(require.resolve('./babel'))
  }

  // Allow app to override babel options
  const babelOptions = modifyBabelOptions
    ? modifyBabelOptions(mainBabelOptions)
    : mainBabelOptions

  if (hasBabelRc && babelOptions.babelrc) {
    console.log('Using .babelrc defined in your app root')
  }

  // Define some useful shorthands.
  const IS_NODE = target === 'node'
  const IS_WEB = target === 'web'
  const IS_PROD = env === 'prod'
  const IS_DEV = env === 'dev'

  process.env.NODE_ENV = IS_PROD ? 'production' : 'development'

  const dotenv = getClientEnv(target, { clearConsole, host, port })

  const devServerPort = parseInt(dotenv.raw.PORT, 10) + 1
  // VMs, Docker containers might not be available at localhost:3001. CLIENT_PUBLIC_PATH can override.
  const clientPublicPath =
    dotenv.raw.CLIENT_PUBLIC_PATH ||
    (IS_DEV ? `http://${dotenv.raw.HOST}:${devServerPort}/` : '/')

  // This is our base webpack config.
  let config = {
    // Set webpack mode:
    mode: IS_DEV ? 'development' : 'production',
    // Set webpack context to the current command's directory
    context: process.cwd(),
    // Specify target (either 'node' or 'web')
    target: target,
    // Controversially, decide on sourcemaps.
    devtool: IS_DEV ? 'cheap-module-source-map' : 'source-map',
    // We need to tell webpack how to resolve both frontend's node_modules and
    // the users', so we use resolve and resolveLoader.
    stats: false,
    resolve: {
      modules: ['node_modules', paths.appNodeModules].concat(
        // It is guaranteed to exist because we tweak it in `env.js`
        nodePath.split(path.delimiter).filter(Boolean),
      ),
      extensions: paths.moduleFileExtensions
        .map(ext => `.${ext}`)
        .filter(ext => useTypeScript || !ext.includes('ts')),
      alias: {
        // This is required so symlinks work during development.
        'webpack/hot/poll': require.resolve('webpack/hot/poll'),
      },
    },
    resolveLoader: {
      modules: [paths.appNodeModules, paths.ownNodeModules],
    },
    module: {
      strictExportPresence: true,
      rules: [
        // Disable require.ensure as it's not a standard language feature.
        { parser: { requireEnsure: false } },

        // First, run the linter.
        // It's important to do this before Babel processes the JS.
        {
          test: /\.(js|mjs|jsx|ts|tsx)$/,
          enforce: 'pre',
          use: [
            {
              options: {
                cache: true,
                formatter: require.resolve('react-dev-utils/eslintFormatter'),
                eslintPath: require.resolve('eslint'),
                resolvePluginsRelativeTo: __dirname,
                ignore: process.env.EXTEND_ESLINT === 'true',
                baseConfig: (() => {
                  // We allow overriding the config only if the env variable is set
                  // if (process.env.EXTEND_ESLINT === 'true') {
                  const eslintCli = new eslint.CLIEngine()
                  let eslintConfig
                  try {
                    eslintConfig = eslintCli.getConfigForFile(
                      paths.appClientIndexJs,
                    )
                  } catch (e) {
                    console.error(e)
                    process.exit(1)
                  }
                  return eslintConfig
                  // } else {
                  //   return {
                  //     extends: [require.resolve('eslint-config-react-app')],
                  //   };
                  // }
                })(),
                useEslintrc: false,
              },
              loader: require.resolve('eslint-loader'),
            },
          ],
          include: paths.appSrc,
        },

        // Avoid "require is not defined" errors
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto',
        },
        // Process application JS with Babel.
        // The preset includes JSX, Flow, TypeScript, and some ESnext features.
        {
          test: /\.(ts|tsx|js|mjs|jsx)$/,
          include: [paths.appSrc],
          loader: require.resolve('babel-loader'),
          options: babelOptions,
        },
        {
          test: /\.(ts|tsx)$/,
          include: [paths.appSrc],
          loader: require.resolve('ts-loader'),
          options: {
            transpileOnly: true,
            experimentalWatchApi: true,
          },
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
            emitFile: IS_WEB,
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
            emitFile: IS_WEB,
          },
        },

        // "postcss" loader applies autoprefixer to our CSS.
        // "css" loader resolves paths in CSS and adds assets as dependencies.
        // "style" loader turns CSS into JS modules that inject <style> tags.
        // In production, we use a plugin to extract that CSS to a file, but
        // in development "style" loader enables hot editing of CSS.
        //
        // Note: this yields the exact same CSS config as create-react-app.
        {
          test: cssRegex,
          exclude: [paths.appBuild, /\.module\.css$/],
          use: IS_NODE
            ? [
              {
                loader: require.resolve('css-loader'),
                options: {
                  importLoaders: 1,
                },
              },
            ]
            : IS_DEV
              ? [
                require.resolve('style-loader'),
                {
                  loader: require.resolve('css-loader'),
                  options: {
                    importLoaders: 1,
                  },
                },
                {
                  loader: require.resolve('postcss-loader'),
                  options: postCssOptions,
                },
              ]
              : [
                MiniCssExtractPlugin.loader,
                {
                  loader: require.resolve('css-loader'),
                  options: {
                    importLoaders: 1,
                    modules: false,
                  },
                },
                {
                  loader: require.resolve('postcss-loader'),
                  options: postCssOptions,
                },
              ],
        },
        // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
        // using the extension .module.css
        {
          test: cssModuleRegex,
          exclude: [paths.appBuild],
          use: IS_NODE
            ? [
              {
                // on the server we do not need to embed the css and just want the identifier mappings
                loader: require.resolve('css-loader'),
                options: {
                  mode: 'local',
                  modules: true,
                  importLoaders: 1,
                  localIdentName: '[path]__[name]___[local]',
                },
              },
            ]
            : IS_DEV
              ? [
                require.resolve('style-loader'),
                {
                  loader: require.resolve('css-loader'),
                  options: {
                    modules: true,
                    importLoaders: 1,
                    localIdentName: '[path]__[name]___[local]',
                  },
                },
                {
                  loader: require.resolve('postcss-loader'),
                  options: postCssOptions,
                },
              ]
              : [
                MiniCssExtractPlugin.loader,
                {
                  loader: require.resolve('css-loader'),
                  options: {
                    modules: true,
                    importLoaders: 1,
                    localIdentName: '[path]__[name]___[local]',
                  },
                },
                {
                  loader: require.resolve('postcss-loader'),
                  options: postCssOptions,
                },
              ],
        },
      ],
    },
    performance: false,
  }

  if (IS_NODE) {
    // We want to uphold node's __filename, and __dirname.
    config.node = {
      __console: false,
      __dirname: false,
      __filename: false,
    }

    // We need to tell webpack what to bundle into our Node bundle.
    config.externals = [
      nodeExternals({
        whitelist: [
          IS_DEV ? 'webpack/hot/poll?300' : null,
          /\.(eot|woff|woff2|ttf|otf)$/,
          /\.(svg|png|jpg|jpeg|gif|ico)$/,
          /\.(mp4|mp3|ogg|swf|webp)$/,
          /\.(css|scss|sass|sss|less)$/,
        ].filter(x => x),
      }),
    ]

    // Specify webpack Node.js output path and filename
    config.output = {
      path: paths.appBuild,
      publicPath: clientPublicPath,
      filename: 'server.js',
      libraryTarget: 'commonjs2',
    }
    // Add some plugins...
    config.plugins = [
      // We define environment variables that can be accessed globally in our
      new webpack.DefinePlugin(dotenv.stringified),
      // Prevent creating multiple chunks for the server
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
    ]

    config.entry = [paths.appServerIndexJs]

    if (IS_DEV) {
      // Use watch mode
      config.watch = true
      config.entry.unshift('webpack/hot/poll?300')

      // Pretty format server errors
      config.entry.unshift(require.resolve('../utils/prettyNodeErrors.js'))

      config.plugins = [
        ...config.plugins,
        // Add hot module replacement
        new webpack.HotModuleReplacementPlugin(),
        // Run server
        new StartServerPlugin({
          name: 'server.js',
          // nodeArgs: ['--inspect=9229'], // allow debugging
          // args: [''], // pass args to script
          // signal: true, // signal to send for HMR (defaults to `false`, uses 'SIGUSR2' if `true`)
          // keyboard: true, // Allow typing 'rs' to restart the server. default: only if NODE_ENV is 'development'
        }),
        // Ignore assets.json to avoid infinite recompile bug
        new webpack.WatchIgnorePlugin([paths.appManifest]),
      ]
    }

    config.optimization = {
      nodeEnv: false,
    }
  }

  if (IS_WEB) {
    config.plugins = [
      // Output our JS and CSS files in a manifest file called assets.json
      // in the build directory.
      new AssetsPlugin({
        path: paths.appBuild,
        filename: 'assets.json',
      }),
      // TypeScript type checking
      useTypeScript &&
      new ForkTsCheckerWebpackPlugin({
        typescript: require.resolve('typescript'),
        async: IS_DEV,
        useTypescriptIncrementalApi: true,
        checkSyntacticErrors: true,
        tsconfig: paths.appTsConfig,
        reportFiles: [
          '**',
          '!**/__tests__/**',
          '!**/?(*.)(spec|test).*',
        ],
        silent: true,
        // The formatter is invoked directly in WebpackDevServerUtils during development
        formatter: IS_PROD ? typescriptFormatter : undefined,
      }),
    ].filter(Boolean)

    if (IS_DEV) {
      // Setup Webpack Dev Server on port 3001 and
      // specify our client entry point /client/index.js
      config.entry = {
        bundle: [
          require.resolve('../utils/webpackHotDevClient'),
          paths.appClientIndexJs,
        ],
      }

      // Configure our client bundles output. Not the public path is to 3001.
      config.output = {
        path: paths.appBuildPublic,
        publicPath: clientPublicPath,
        pathinfo: true,
        libraryTarget: 'var',
        filename: 'static/js/[name].js',
        chunkFilename: 'static/js/[name].chunk.js',
        devtoolModuleFilenameTemplate: info =>
          path.resolve(info.resourcePath).replace(/\\/g, '/'),
      }
      // Configure webpack-dev-server to serve our client-side bundle from
      // http://${dotenv.raw.HOST}:3001
      config.devServer = {
        disableHostCheck: true,
        clientLogLevel: 'none',
        // color: false,
        // contentBase: paths.appBuild,
        // By default files from `contentBase` will not trigger a page reload.
        // watchContentBase: true,
        // Enable gzip compression of generated files.
        compress: true,
        // watchContentBase: true,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        historyApiFallback: {
          // Paths with dots should still use the history fallback.
          // See https://github.com/facebookincubator/create-react-app/issues/387.
          disableDotRule: true,
        },
        host: dotenv.raw.HOST,
        hot: true,
        stats: 'errors-only',
        noInfo: true,
        overlay: false,
        port: devServerPort,
        quiet: false,
        // By default files from `contentBase` will not trigger a page reload.
        // Reportedly, this avoids CPU overload on some systems.
        // https://github.com/facebookincubator/create-react-app/issues/293
        watchOptions: {
          ignored: /node_modules/,
        },
        before(app, server) {
          // This lets us fetch source contents from webpack for the error overlay
          app.use(evalSourceMapMiddleware(server))
          // This lets us open files from the runtime error overlay.
          app.use(errorOverlayMiddleware())
        },
      }
      // Add client-only development plugins
      config.plugins = [
        ...config.plugins,
        new webpack.HotModuleReplacementPlugin({
          multiStep: true,
        }),
        new webpack.DefinePlugin(dotenv.stringified),
      ]

      config.optimization = {}
    } else {
      // Specify production entry point (/client/index.js)
      config.entry = {
        bundle: paths.appClientIndexJs,
      }

      // Specify the client output directory and paths. Notice that we have
      // changed the publiPath to just '/' from http://localhost:3001. This is because
      // we will only be using one port in production.
      config.output = {
        path: paths.appBuildPublic,
        publicPath: dotenv.raw.PUBLIC_PATH || '/',
        filename: 'static/js/[name].[chunkhash:8].js',
        chunkFilename: 'static/js/[name].[chunkhash:8].js',
        jsonpFunction: 'wsp',
        libraryTarget: 'var',
        strictModuleExceptionHandling: true,
      }

      config.plugins = [
        ...config.plugins,
        // Define production environment vars
        new webpack.DefinePlugin(dotenv.stringified),
        // Extract our CSS into a files.
        new MiniCssExtractPlugin({
          filename: 'static/css/[name].[contenthash:8].css',
          chunkFilename: 'static/css/[name].[contenthash:8].css',
          // allChunks: true because we want all css to be included in the main
          // css bundle when doing code splitting to avoid FOUC:
          // https://github.com/facebook/create-react-app/issues/2415
          allChunks: true,
        }),
        new webpack.HashedModuleIdsPlugin(),
        // new webpack.optimize.AggressiveMergingPlugin(),
      ]

      config.optimization = {
        removeAvailableModules: true,
        noEmitOnErrors: true,
        checkWasmTypes: false,
        // nodeEnv: false,
        moduleIds: 'hashed',
        usedExports: true,

        runtimeChunk: {
          name: 'runtime',
        },

        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 3,
              reuseExistingChunk: true,
            },
            react: {
              name: 'commons',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-loadable)[\\/]/,
            },
          }
        },

        minimize: true,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              parse: {
                // we want uglify-js to parse ecma 8 code. However, we don't want it
                // to apply any minfication steps that turns valid ecma 5 code
                // into invalid ecma 5 code. This is why the 'compress' and 'output'
                // sections only apply transformations that are ecma 5 safe
                // https://github.com/facebook/create-react-app/pull/4234
                ecma: 8,
              },
              compress: {
                ecma: 5,
                warnings: false,
                // Disabled because of an issue with Uglify breaking seemingly valid code:
                // https://github.com/facebook/create-react-app/issues/2376
                // Pending further investigation:
                // https://github.com/mishoo/UglifyJS2/issues/2011
                comparisons: false,
                // Disabled because of an issue with Terser breaking valid code:
                // https://github.com/facebook/create-react-app/issues/5250
                // Pending futher investigation:
                // https://github.com/terser-js/terser/issues/120
                inline: 2,
              },
              mangle: {
                safari10: true,
              },
              output: {
                ecma: 5,
                comments: false,
                // Turned on because emoji and regex is not minified properly using default
                // https://github.com/facebook/create-react-app/issues/2488
                ascii_only: true,
              },
            },
            // Use multi-process parallel running to improve the build speed
            // Default number of concurrent runs: os.cpus().length - 1
            parallel: true,
            // Enable file caching
            cache: true,
            sourceMap: false,
          }),
          new OptimizeCSSAssetsPlugin({
            cssProcessorOptions: {
              parser: safePostCssParser,
              map: {
                // `inline: false` forces the sourcemap to be output into a
                // separate file
                inline: false,
                // `annotation: true` appends the sourceMappingURL to the end of
                // the css file, helping the browser find the sourcemap
                annotation: true,
              },
            },
          }),
        ],
      }
    }
  }

  if (IS_DEV) {
    config.plugins = [
      ...config.plugins,
      new WebpackBar({
        color: target === 'web' ? '#6be2f5' : '#e2f56b',
        name: target === 'web' ? 'client' : 'server',
      }),
    ]
  }

  // Apply plugins, if they are present in frontend.config.js
  if (Array.isArray(plugins)) {
    plugins.forEach(plugin => {
      config = runPlugin(
        plugin,
        config,
        { target, dev: IS_DEV },
        webpackObject,
      )
    })
  }

  // Check if frontend.config has a modify function. If it does, call it on the
  // configs we created.
  if (modify) {
    config = modify(config, { target, dev: IS_DEV }, webpackObject)
  }

  return config
}

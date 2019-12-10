const fs = require('fs-extra')
const path = require('path')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const nodeExternals = require('webpack-node-externals')
const AssetsPlugin = require('assets-webpack-plugin')
// const StartServerPlugin = require('start-server-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const safePostCssParser = require('postcss-safe-parser')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware')
// const WebpackBar = require('webpackbar')
// const { ReactLoadablePlugin } = require('react-loadable/webpack')
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
// const ErrorOverlayPlugin = require('error-overlay-webpack-plugin')

const babelPreset = require('./babel')
const paths = require('./paths')
const runPlugin = require('./runPlugin')
const getClientEnvironment = require('./env')

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

  const dotenv = getClientEnvironment(target, { clearConsole, host, port })
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
    // We need to tell webpack how to resolve both Frontend's node_modules and
    // the users', so we use resolve and resolveLoader.
    resolve: {
      modules: ['node_modules', paths.appNodeModules].concat(
        // It is guaranteed to exist because we tweak it in `env.js`
        // nodePath.split(path.delimiter).filter(Boolean),
      ),
      extensions: ['.mjs', '.jsx', '.js', '.ts', '.tsx', '.json'],
      // alias: {
      //   // This is required so symlinks work during development.
      //   'webpack/hot/poll': require.resolve('webpack/hot/poll'),
      // },
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
              options: babelOptions,
            },
          ],
        },
        {
          test: /\.tsx?$/,
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
          test: /\.css$/,
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
          test: /\.module\.css$/,
          exclude: [paths.appBuild],
          use: IS_NODE
            ? [
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
                    minimize: true,
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

    config.entry = [paths.appServerEntry]

    // Disabling replace env variables for runtime
    config.optimization = {
      nodeEnv: false,
    }

    if (IS_DEV) {
      // Use watch mode
      // config.watch = true
      // config.entry.unshift('webpack/hot/poll?300')

      const nodeArgs = ['-r', 'source-map-support/register']

      config.plugins = [
        ...config.plugins,
        // Add hot module replacement
        new webpack.HotModuleReplacementPlugin(),
        // Supress errors to console (we use our own logger)
        // new StartServerPlugin({
        //   name: 'server.js',
        //   nodeArgs,
        // }),
        // Ignore assets.json to avoid infinite recompile bug
        // new webpack.WatchIgnorePlugin([paths.appManifest, paths.loadableManifest]),
      ]
    }
  }

  if (IS_WEB) {
    config.plugins = [
      // new ReactLoadablePlugin({
      //   filename: paths.loadableManifest,
      // }),
      // Output our JS and CSS files in a manifest file called assets.json
      // in the build directory.
      // new AssetsPlugin({
      //   path: paths.appBuild,
      //   filename: 'assets.json',
      // }),
    ]

    if (IS_DEV) {
      // Setup Webpack Dev Server on port 3001 and
      // specify our client entry point /client/index.js
      config.entry = {
        bundle: [
          require.resolve('react-dev-utils/webpackHotDevClient'),
          // require.resolve('../utils/webpackHotDevClient'),
          paths.appClientEntry,
        ],
      }

      // Configure our client bundles output. Not the public path is to 3001.
      config.output = {
        path: paths.appBuild,
        publicPath: clientPublicPath,
        pathinfo: true,
        libraryTarget: 'var',
        filename: 'static/js/bundle.js',
        chunkFilename: 'static/js/[name].chunk.js',
        devtoolModuleFilenameTemplate: info =>
          path.resolve(info.resourcePath).replace(/\\/g, '/'),
      }

      // Add client-only development plugins
      config.plugins = [
        ...config.plugins,
        new webpack.HotModuleReplacementPlugin(),
        new webpack.DefinePlugin(dotenv.stringified),
        // new BundleAnalyzerPlugin({
        //   analyzerMode: 'static',
        //   openAnalyzer: false,
        // }),
        // new ErrorOverlayPlugin()
      ]
    } else {
      // Specify production entry point (/client/index.js)
      config.entry = {
        bundle: [paths.appClientEntry],
      }

      // Specify the client output directory and paths. Notice that we have
      // changed the publiPath to just '/' from http://localhost:3001. This is because
      // we will only be using one port in production.
      config.output = {
        path: paths.appBuild,
        publicPath: dotenv.raw.PUBLIC_PATH || '/',
        filename: 'static/js/[name].[chunkhash:8].js',
        chunkFilename: 'static/js/[name].[chunkhash:8].js',
        jsonpFunction: 'wsp',
        libraryTarget: 'var',
      }

      config.plugins = [
        ...config.plugins,
        // Define production environment vars
        new webpack.DefinePlugin(dotenv.stringified),
        // Extract our CSS into a files.
        new MiniCssExtractPlugin({
          filename: 'static/css/bundle.[contenthash:8].css',
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
        nodeEnv: false,
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
          },
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
                safari10: true,
                comments: false,
                ascii_only: true,
                beautify: false,
              },
            },
            // Use multi-process parallel running to improve the build speed
            // Default number of concurrent runs: os.cpus().length - 1
            parallel: true,
            // Enable file caching
            cache: true,
            // @todo add flag for sourcemaps
            sourceMap: true,
          }),
          new OptimizeCSSAssetsPlugin({
            cssProcessorOptions: {
              parser: safePostCssParser,
              // @todo add flag for sourcemaps
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
      // new WebpackBar({
      //   color: target === 'web' ? '#f56be2' : '#c065f4',
      //   name: target === 'web' ? 'client' : 'server',
      // }),
    ]
  }

  // Apply frontend plugins, if they are present in frontend.config.js
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

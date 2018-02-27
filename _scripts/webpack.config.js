const webpack = require('webpack');
const path = require('path');
const autoprefixer = require('autoprefixer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const browsers = require('../package.json').browserslist;

//Get path so every environment works
const projectPath = path.resolve(__dirname);

//Environment check depending on call from
const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

//Define all the global config for both production & dev
const config = {
    entry: {
        main: [
            projectPath + '/../public/js/main.js',
            projectPath + '/../public/scss/style.scss'
        ]
    },
    output: {
        path: projectPath + '/../public/dist/',
        filename: '[name].[hash:6].js'
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['babel-preset-es2015'].map(require.resolve),
                    sourceMaps: 'inline'
                }
            },
            {
                test: /\.(css|scss)$/,
                loader: ExtractTextPlugin.extract({
                    use: [
                        'raw-loader?url=false', {
                            loader: 'postcss-loader',
                            options: {
                                ident: 'postcss',
                                context: path.resolve(__dirname, '../public'),
                                sourceMap: 'inline',
                                plugins: [
                                    autoprefixer({browsers})
                                ]
                            }
                        },
                        'sass-loader?sourceMap=true'
                    ]
                })
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify(env)
            }
        }),
        new ExtractTextPlugin({filename: 'main.[hash:6].css', allChunks: true}),
        new ManifestPlugin({
            fileName: 'rev-manifest.json'
        })
    ],
    resolve: {
        extensions: ['.js'],
        modules: [path.join(__dirname, '../node_modules')]
    }
};

//Extra options depending on environment
if (isProd) {
    Object.assign(config, {
        plugins: config.plugins.concat([
            new webpack.LoaderOptionsPlugin({
                minimize: true
            }),
            new webpack.optimize.UglifyJsPlugin({
                drop_console: true,
                output: {
                    comments: false
                },
                compressor: {
                    screw_ie8: true,
                    warnings: false
                }
            })
        ])
    });
} else {
    Object.assign(config, {
        devtool: 'cheap-module-eval-source-map',
        plugins: config.plugins.concat([
            new webpack.NoEmitOnErrorsPlugin()
        ])
    });
}

module.exports = config;

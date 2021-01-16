const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

//Get path so every environment works
const projectPath = path.resolve(__dirname);

//Environment check depending on call from
const env = process.env.NODE_ENV || 'development';

//Define all the global config for both production & dev
module.exports = {
    entry: {
        main: [
            projectPath + '/../public/js/main.js',
            projectPath + '/../public/scss/style.scss'
        ]
    },
    output: {
        path: projectPath + '/../public/dist/',
        filename: '[name].[fullhash:6].js',
        publicPath: ''
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            require.resolve('@babel/preset-env')
                        ]
                    }
                }
            },
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader?url=false',
                    'sass-loader'
                ]
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify(env)
            }
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[fullhash:6].css'
        }),
        new WebpackManifestPlugin({
            fileName: 'rev-manifest.json'
        })
    ],
    resolve: {
        extensions: ['.js'],
        modules: [path.join(__dirname, '../node_modules')]
    }
};

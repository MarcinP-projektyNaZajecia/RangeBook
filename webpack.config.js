import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

export default {
    mode: process.env.NODE_ENV || 'development', // Tryb deweloperski lub produkcyjny
    entry: './src/main.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve('dist'),
    },
    devServer: {
        static: path.resolve('dist'),
        port: 8080,
        open: true,
        historyApiFallback: true,
    },
    devtool: process.env.NODE_ENV === 'development' ? 'inline-source-map' : false, // Source map tylko w trybie deweloperskim
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: 'babel-loader',
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                ],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
            inject: 'body',
            minify: process.env.NODE_ENV === 'production' ? {
                collapseWhitespace: true,
                removeComments: true,
            } : false,
        }),
        new MiniCssExtractPlugin({
            filename: 'style.css',
        }),
    ],
    resolve: {
        extensions: ['.js'],
    },
};
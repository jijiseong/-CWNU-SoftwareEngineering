const path = require("path");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
    entry: './src/public/js/app.js',
    mode: "development",
    watch: true,
    plugins: [

        new MiniCssExtractPlugin({
            filename: "css/style.css",
        })
    ],
    output: {
        path: path.resolve(__dirname, "assets"),
        filename: 'js/bundle.js',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', { targets: "defaults" }]
                        ]
                    }
                }
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            }
        ]
    }
};
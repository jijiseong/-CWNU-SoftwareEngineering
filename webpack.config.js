const path = require("path");

module.exports = {
    entry: './src/public/js/app.js',
    mode: "development",
    watch: true,
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
        ]
    }
};
const path = require("path");

module.exports = {
    mode: "development",
    target: "electron-renderer",
    entry: "./src/main.ts",
    output: {
        path: path.resolve(__dirname, "lib"),
        filename: "main.js",
        library: {type: "commonjs2"},
    },
    resolve: {extensions: [".ts", ".tsx", ".js"]},
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {loader: "ts-loader", options: {transpileOnly: true}},
                exclude: /node_modules/,
            },
        ],
    },
    // provided by the Mailspring host at runtime
    externals: {
        "mailspring-exports": "commonjs mailspring-exports",
        "mailspring-component-kit": "commonjs mailspring-component-kit",
        "@electron/remote": "commonjs @electron/remote",
    },
    devtool: "source-map",
};

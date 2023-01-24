"use strict";

process.env.BABEL_ENV = "main";

const path = require("path");
const { dependencies } = require("../package.json");
const webpack = require("webpack");

const TerserPlugin = require("terser-webpack-plugin");

const SentryWebpackPlugin = require("@sentry/webpack-plugin");

let mainConfig = {
  entry: {
    main: path.join(__dirname, "../src/main/index.js"),
  },
  externals: [...Object.keys(dependencies || {})],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.node$/,
        use: "node-loader",
      },
    ],
  },
  node: {
    __dirname: process.env.NODE_ENV !== "production",
    __filename: process.env.NODE_ENV !== "production",
  },
  output: {
    filename: "[name].js",
    libraryTarget: "commonjs2",
    path: path.join(__dirname, "../dist/electron"),
  },
  devtool: "source-map", // Source map generation must be turned on for Sentry to work
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new SentryWebpackPlugin({
      org: "albermonte",
      project: "nim-pools-hub-miner",

      // Specify the directory containing build artifacts
      include: "./dist",

      // Auth tokens can be obtained from https://sentry.io/settings/account/api/auth-tokens/
      // and needs the `project:releases` and `org:read` scopes
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Optionally uncomment the line below to override automatic release name detection
      // release: process.env.RELEASE,
    }),],
  resolve: {
    extensions: [".js", ".json", ".node"],
  },
  target: "electron-main",
};

/**
 * Adjust mainConfig for development settings
 */
if (process.env.NODE_ENV !== "production") {
  mainConfig.plugins.push(
    new webpack.DefinePlugin({
      __static: `"${path.join(__dirname, "../static").replace(/\\/g, "\\\\")}"`,
    })
  );
}

/**
 * Adjust mainConfig for production settings
 */
if (process.env.NODE_ENV === "production") {
  mainConfig.plugins.push(
    new TerserPlugin(),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": '"production"',
    })
  );
}

module.exports = mainConfig;

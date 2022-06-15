/**
 * @typedef {import('webpack').Configuration} WebpackConfig
 */
// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");

const isProduction = process.env.NODE_ENV == "production";

/** @type WebpackConfig */
const config = {
  context: __dirname,
  entry: {
    host: {
      import: "./src/host/index.ts",
      chunkLoading: false,
      library: {
        type: "commonjs-static",
      },
    },
    react: {
      dependOn: "host",
      import: "./src/host/index.ts",
      chunkLoading: false,
      library: {
        type: "commonjs-static",
      },
    },
    guest: {
      dependOn: "host",
      import: "./src/guest/index.ts",
      chunkLoading: false,
      runtime: false,
      library: {
        type: "commonjs-static",
      },
    },
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  plugins: [
    // Add your plugins here
    // Learn more about plugins from https://webpack.js.org/configuration/plugins/
  ],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/i,
        loader: "ts-loader",
        exclude: ["/node_modules/"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", "..."],
  },
  externals: {
    react: "react",
  },
};

module.exports = () => {
  if (isProduction) {
    config.mode = "production";
  } else {
    config.mode = "development";
  }
  return config;
};

const path = require("path");
const { readdir } = require("fs/promises");
const { DefinePlugin } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const pkg = require("./package.json");

const paintingTypes = new Set([".jpg", ".png", ".jpeg"]);
async function getPaintings() {
  const assets = await readdir("./public/paintings");
  const paintings = assets.filter((asset) =>
    paintingTypes.has(path.extname(asset))
  );
  return paintings.map((painting) => ({
    id: path.basename(painting, path.extname(painting)),
    src: path.join("paintings/", painting),
  }));
}

module.exports = async (_, { mode }) => {
  const isDev = mode === "development";
  /** @type {import('webpack').Configuration} */
  const theConfig = {
    entry: "./src/index.jsx",
    output: {
      assetModuleFilename: "[name][ext]",
    },
    devServer: {
      port: process.env.MULTI_SERVER_PORT || 3002,
      devMiddleware: {
        stats: false,
      },
    },
    infrastructureLogging: {
      level: isDev ? "warn" : "info",
    },
    stats: "errors-warnings",
    devtool: isDev && "source-map",
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env", "@babel/preset-react"],
            },
          },
        },
        {
          test: /\.jsx?$/,
          enforce: "pre",
          use: ["source-map-loader"],
        },
      ],
    },
    resolve: {
      extensions: ["*", ".js", ".jsx"],
    },
    plugins: [
      new DefinePlugin({
        HOST_ID: JSON.stringify(pkg.description),
        REGISTRY_URL: JSON.stringify(
          process.env.REGISTRY_URL || "http://localhost:3000"
        ),
      }),
      new HtmlWebpackPlugin({
        template: "./index.html",
        title: pkg.description,
        paintingsList: JSON.stringify(await getPaintings()),
      }),
    ],
    performance: {
      hints: false
    }
  };
  if (!isDev) {
    const CopyWebpackPlugin = require("copy-webpack-plugin");
    theConfig.plugins.push(
      new CopyWebpackPlugin({
        patterns: [{ from: "public" }],
      })
    );
  }
  return theConfig;
};

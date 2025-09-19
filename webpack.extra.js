// extra-webpack.config.js
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: { sourceMap: true },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                // Tells postcss-loader to read your config from postcss.config.js
                config: './postcss.config.js'
              }
            },
          },
          {
            loader: 'sass-loader',
            options: { sourceMap: true },
          }
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin()
  ]
};
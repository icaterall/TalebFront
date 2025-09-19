const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const purgecss = require('@fullhuman/postcss-purgecss');

/**
 * The custom-webpack builder passes us the *base* Angular CLI Webpack config
 * in `config`. We just modify or extend it as needed and return it.
 */
module.exports = (config, { configuration }) => {
  // Only apply these extra optimizations in production mode
  if (configuration === 'production') {
    // 1) Ensure there's a minimizer array; push our CssMinimizerPlugin
    config.optimization.minimizer = config.optimization.minimizer || [];
    // If Angular CLI hasn't already added CssMinimizerPlugin, push it:
    if (!config.optimization.minimizer.some((m) => m instanceof CssMinimizerPlugin)) {
      config.optimization.minimizer.push(new CssMinimizerPlugin({
        // Optional: pass custom minimizer options here
        parallel: true,
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              // Feel free to add more advanced cssnano options:
              // https://cssnano.co/docs/optimisations
            },
          ],
        },
      }));
    }

    // 2) Inject PurgeCSS into Angular’s existing postcss-loader
    //    so it removes unused CSS classes based on your HTML/TS templates.
    const scssRule = config.module.rules.find(
      (rule) => rule.test && rule.test.toString().includes('scss')
    );

    if (scssRule && scssRule.use) {
      // postcss-loader is typically nested in the `use` array for SCSS
      const postcssLoader = scssRule.use.find(
        (u) => u.loader && u.loader.includes('postcss-loader')
      );

      if (postcssLoader) {
        // Ensure postcssOptions object is there
        postcssLoader.options.postcssOptions = postcssLoader.options.postcssOptions || {};
        postcssLoader.options.postcssOptions.plugins =
          postcssLoader.options.postcssOptions.plugins || [];

        // Push in PurgeCSS
        postcssLoader.options.postcssOptions.plugins.push(
          purgecss({
            // Adjust these file globs to match where your HTML & TS code live
            content: [
              './src/**/*.html',
              './src/**/*.ts'
            ],
            // A default extractor that suits Angular fairly well:
            defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
            // Optionally, safelist complex or dynamic classes
            // that PurgeCSS would mistakenly remove:
            safelist: [
              // Example: Keep anything that starts with 'table'
              // (Because some complex nested .table classes might get dropped)
              /^table/,
              // Or if you have certain dynamic classes you reference in TS code:
              // 'class-you-need-to-keep',
            ],
          })
        );
      }
    }
  }

  // Return the modified config back to Angular
  return config;
};

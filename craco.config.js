const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // mupdf-wasm.js has dead-code Node.js paths that reference core modules
      // using the "node:" URI scheme.  Strip the prefix so Webpack can resolve
      // them to the empty fallbacks defined below.
      webpackConfig.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );

      webpackConfig.resolve = webpackConfig.resolve || {};
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        // All of these are Node.js-only; provide empty modules for the browser.
        module: false,
        fs:     false,
        path:   false,
        url:    false,
        crypto: false,
      };
      // mupdf uses top-level await for WASM initialization.
      // Webpack 5 requires this experiment to be explicitly enabled.
      webpackConfig.experiments = {
        ...webpackConfig.experiments,
        topLevelAwait: true,
        asyncWebAssembly: true,
      };

      // Disable the ESLint webpack plugin so that lint warnings never cause
      // the build to fail (CI=true would otherwise treat warnings as errors).
      webpackConfig.plugins = webpackConfig.plugins.filter(
        (p) => p.constructor.name !== "ESLintWebpackPlugin"
      );

      return webpackConfig;
    },
  },
};


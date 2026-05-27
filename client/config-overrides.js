const path = require('path');

module.exports = function override(config) {
  const sourceMapRule = config.module.rules.find(
    rule => Array.isArray(rule.oneOf)
  );

  if (sourceMapRule) {
    sourceMapRule.oneOf.forEach(rule => {
      if (
        rule.loader &&
        rule.loader.includes('source-map-loader') &&
        rule.options
      ) {
        const exclude = rule.exclude || [];
        rule.exclude = Array.isArray(exclude)
          ? [...exclude, /node_modules[\\/]html5-qrcode[\\/]/]
          : [exclude, /node_modules[\\/]html5-qrcode[\\/]/];
      }
    });
  }

  return config;
};

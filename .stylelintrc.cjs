// Only duplicates. Everything else OFF.
module.exports = {
  customSyntax: 'postcss-scss',
  rules: {
    'no-duplicate-selectors': [true, { severity: 'error' }],
    'declaration-block-no-duplicate-properties': [true, {
      ignore: ['consecutive-duplicates-with-different-values'],
      severity: 'error'
    }]
  }
};

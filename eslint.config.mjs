import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  test: {
    overrides: {
      'e18e/prefer-static-regex': 'off',
      'node/prefer-global/buffer': 'off',
      'node/prefer-global/process': 'off',
    },
  },
}, {
  // apps/api is a pure Node.js backend — global process/Buffer are fine
  files: ['apps/api/src/**'],
  rules: {
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',
  },
})

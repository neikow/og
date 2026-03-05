import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: {
    overrides: {
      'node/prefer-global/process': 'off',
      'node/prefer-global/buffer': 'off',
    },
  },
  test: {
    overrides: {
      'e18e/prefer-static-regex': 'off',
    },
  },
})

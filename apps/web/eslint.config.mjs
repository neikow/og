import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  react: {
    overrides: {
      'no-alert': 'off',
      'react/no-array-index-key': 'off',
    },
  },
})

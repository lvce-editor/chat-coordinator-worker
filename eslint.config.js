import * as config from '@lvce-editor/eslint-config'
import * as actions from '@lvce-editor/eslint-plugin-github-actions'
import * as tsconfig from '@lvce-editor/eslint-plugin-tsconfig'

export default [
  ...config.default,
  ...actions.default,
  ...tsconfig.default,
  {
    rules: {
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/updated-loop-counter': 'off',
      'sonarjs/use-type-alias': 'off',
      'sonarjs/void-use': 'off',
    },
  },
  {
    files: ['packages/chat-coordinator-worker/test/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'jest/no-disabled-tests': 'off',
    },
  },
]

import js from '@eslint/js'
import globals from 'globals'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default [
  // Base config for all files
  { ignores: ['.eslintrc.js', 'node_modules/**', 'dist/**'] },

  // Default JS config
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: { ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules: {
      ...js.configs.recommended.rules,
      // Disable built-in unused vars rule to avoid conflicts with TS rule
      'no-unused-vars': 'off',
    },
  },

  // TypeScript configuration
  {
    files: ['**/*.ts'],
    plugins: { '@typescript-eslint': typescriptEslint },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: { project: 'tsconfig.json', sourceType: 'module' },
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/lines-between-class-members': 'off',
      '@typescript-eslint/no-throw-literal': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
      // Use the TypeScript version of the no-unused-vars rule with a warning level
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Shared rules for all files
  {
    files: ['**/*.{js,ts}'],
    rules: {
      'no-param-reassign': 'off',
      'no-restricted-syntax': 'off',
      'class-methods-use-this': 'off',
      'arrow-body-style': 'off',
      'arrow-parens': 'off',
      'linebreak-style': 'off',
      'lines-between-class-members': 'off',
      'max-len': 'off',
      'no-console': 'off',
      'no-bitwise': 'off',
      'no-continue': 'off',
      'no-empty-function': 'off',
      'no-nested-ternary': 'off',
      'no-plusplus': 'off',
      'no-underscore-dangle': 'off',
      'max-classes-per-file': 'off',
      // Remove this rule as we're using the TypeScript version
      semi: ['error', 'never'],
    },
  },

  // Prettier configuration
  {
    files: ['**/*.{js,ts}'],
    plugins: { prettier: prettierPlugin },
    rules: { ...prettierPlugin.configs.recommended.rules },
  },

  // Apply prettier config as the last one to override other formatting rules
  prettierConfig,
]

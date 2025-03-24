import js from '@eslint/js'
import globals from 'globals'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'
import unusedImportsPlugin from 'eslint-plugin-unused-imports'
import prettierConfig from 'eslint-config-prettier'

export default [
  // Base config for all files
  {
    ignores: ['node_modules/**', 'build/**', 'public/build/**', '.react-router/**'],
  },

  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.es2021,
        process: 'readonly',
        React: 'readonly',
        HeadersInit: 'readonly',
        FormDataEntryValue: 'readonly',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: js.configs.recommended.rules,
  },

  // React configuration
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'jsx-a11y': jsxA11yPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
      formComponents: ['Form'],
      linkComponents: [
        { name: 'Link', linkAttribute: 'to' },
        { name: 'NavLink', linkAttribute: 'to' },
      ],
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      'react/jsx-no-leaked-render': ['warn', { validStrategies: ['ternary'] }],
      'react/prop-types': 'off',

      // TODO: Re-enable these rules in future
      'jsx-a11y/anchor-has-content': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'react/no-unescaped-entities': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
    },
  },

  // TypeScript configuration
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
      import: importPlugin,
      'unused-imports': unusedImportsPlugin,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: false,
      },
    },
    settings: {
      'import/internal-regex': '^~/',
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx'] },
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      'jsx-quotes': ['error', 'prefer-single'],
      'comma-dangle': ['warn', 'always-multiline'],
      'import/order': [
        'error',
        {
          alphabetize: { caseInsensitive: true, order: 'asc' },
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
          'newlines-between': 'always',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
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

  // Node environment configuration
  {
    files: ['.eslintrc.cjs', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Apply prettier config as the last one to override other formatting rules
  prettierConfig,
]

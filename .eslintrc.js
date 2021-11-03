'use strict';

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.json',
  },
  env: {
    node: true,
    jest: true,
  },
  plugins: ['prettier', '@typescript-eslint'],
  rules: {
    'prettier/prettier': 'error',
  },
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-var-requires': 'error',
      },
    },
    {
      files: ['.*.js'],
      parser: 'esprima',
      parserOptions: {
        sourceType: 'script',
      },
      rules: {
        strict: ['error', 'global'],
      },
    },
  ],
};

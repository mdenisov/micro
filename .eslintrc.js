module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true
  },
  extends: [
    'standard'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: [
    'react',
    '@typescript-eslint'
  ],
  rules: {
    "no-unused-vars": 0,
    "space-before-function-paren": 0,
    "comma-dangle": ["error", "only-multiline"],
    "camelcase": 0,
    "func-call-spacing": 0,
    "no-mixed-operators": 1,
    "no-async-promise-executor": 1,
    "no-irregular-whitespace": 1,
    "no-path-concat": 1,
    "no-useless-escape": 1,
  }
};

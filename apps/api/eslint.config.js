import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType:  'module',
      globals: {
        process:   'readonly',
        console:   'readonly',
        Buffer:    'readonly',
        __dirname: 'readonly',
        __filename:'readonly',
        setTimeout:'readonly',
        clearTimeout: 'readonly',
        URL:       'readonly',
        crypto:    'readonly',
        fetch:     'readonly',
        URLSearchParams: 'readonly',
        setInterval:     'readonly',
        clearInterval:   'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console':     'off',
    },
    ignores: ['node_modules/**'],
  },
];

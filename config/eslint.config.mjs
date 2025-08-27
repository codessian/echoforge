import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';

export default ts.config(js.configs.recommended, ...ts.configs.recommended, {
  languageOptions: { globals: globals.node },
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          '../*',
          '../../*', 
          '**/src/*',
          '*/src/*',
          '@echoforge/*/src/*'
        ],
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  },
  ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/*.d.ts'],
});

export default [{ ignores: ['**/dist/**','**/node_modules/**'] }, ... (globalThis.__ESLINT_CONFIG__ || [])];

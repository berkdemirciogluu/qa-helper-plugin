import preact from 'eslint-config-preact';
import tseslint from 'typescript-eslint';

export default [
  ...preact,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Extension lib dosyaları [ModuleName] prefix ile console kullanır
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];

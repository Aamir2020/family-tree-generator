import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      ...hooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      curly: ['error', 'all'],
      'one-var': ['error', 'never'],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['tests/**/*.ts', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);

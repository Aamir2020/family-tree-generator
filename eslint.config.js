import js from '@eslint/js';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
export default [{ ignores: ['dist/**','node_modules/**'] }, js.configs.recommended, { files: ['**/*.{js,jsx}'], languageOptions: { globals: {...globals.browser,...globals.node}, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } }, plugins: { 'react-hooks': hooks }, rules: { ...hooks.configs.recommended.rules, 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]', argsIgnorePattern: '^_' }], 'react-hooks/exhaustive-deps': 'off' } }];

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      // TS already reports undefined globals (ts(2304)) via vue-tsc; the base
      // no-undef rule can't see ambient DOM lib types and false-positives on
      // them in .vue script blocks, same as the recommended TS override.
      'no-undef': 'off',
    },
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
);

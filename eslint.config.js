import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import sveltePlugin from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'
import tsParser from '@typescript-eslint/parser'

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...sveltePlugin.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { parser: tsParser },
    },
  },
  {
    // Astro generates src/env.d.ts with a triple-slash reference — allow it in .d.ts files
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '.astro/', 'reports/', '.vercel/'],
  },
]

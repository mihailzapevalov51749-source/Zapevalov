import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import {
  phase9LegacyFreezeAllowlistGlobs,
  phase9LegacyFreezeGuardGlobs,
  phase9LegacyFreezeRestrictedPatterns,
} from './eslint.phase9-legacy-freeze.js'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Phase 9.1 — Legacy Freeze: block new Universal Table imports in object-centric layers
  {
    files: phase9LegacyFreezeGuardGlobs,
    ignores: phase9LegacyFreezeAllowlistGlobs,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: phase9LegacyFreezeRestrictedPatterns,
        },
      ],
    },
  },
])

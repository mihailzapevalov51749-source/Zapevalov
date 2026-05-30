/**
 * Phase 9.1 Legacy Freeze — guarded paths and ESLint allowlist overrides.
 * @see docs/architecture/YASNOPRO_PHASE9_LEGACY_FREEZE.md
 * @see docs/architecture/YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md
 */

export const PHASE9_LEGACY_FREEZE_MESSAGE =
  'Phase 9 Legacy Freeze: импорт Universal Table запрещён в object-centric модулях. См. docs/architecture/YASNOPRO_PHASE9_LEGACY_FREEZE.md и YASNOPRO_PHASE9_LEGACY_ALLOWLIST.md.';

/** Globs relative to frontend/ — новый object-centric код */
export const phase9LegacyFreezeGuardGlobs = [
  'src/modules/objectViews/**/*.{js,jsx}',
  'src/modules/objectEntities/**/*.{js,jsx}',
  'src/shared/**/*.{js,jsx}',
  'src/modules/designer/**/*.{js,jsx}',
  'src/modules/runtimeWriteGateway/**/*.{js,jsx}',
  'src/modules/objectTypeTable/**/*.{js,jsx}',
];

/**
 * Explicit allowlist: shared bridge until Portal Runtime Phase 9.2.
 * Paths relative to frontend/
 */
export const phase9LegacyFreezeAllowlistGlobs = [
  'src/shared/shell/sidebar/usePlatformSidebarControls.js',
];

export const phase9LegacyFreezeRestrictedPatterns = [
  {
    group: ['**/universalTable', '**/universalTable/**', '**/modules/universalTable/**'],
    message: PHASE9_LEGACY_FREEZE_MESSAGE,
  },
];

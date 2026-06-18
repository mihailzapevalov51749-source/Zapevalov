# Runtime scripts (WI-RUNTIME-ISOLATION-03B)

Physical TEMPLATE frontend runtime lives **outside** the DEV git workspace:

```text
../runtime/template/
├── current/          # junction -> releases/release-NNN
└── releases/
    └── release-NNN/
        ├── manifest.json
        └── frontend/
```

## Promote

From repo root:

```powershell
.\scripts\runtime\promote_template_frontend.ps1
```

Flow:

```text
frontend/src
  -> vite build --mode template
  -> frontend/.build-staging/template
  -> ../runtime/template/releases/release-NNN/frontend
  -> junction ../runtime/template/current
```

## Verify

```powershell
.\scripts\runtime\verify_template_runtime.ps1
```

## Rollback

```powershell
.\scripts\runtime\promote_template_frontend.ps1 -SwitchToRelease release-001
.\scripts\runtime\promote_template_frontend.ps1 -ListReleases
```

## Current switch

Windows directory **junction** on `current` → `releases/release-NNN`.

Rationale: atomic repoint without copying files; safe for local dev; no admin rights required.

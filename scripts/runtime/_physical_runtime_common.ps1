# Shared helpers for physical runtime promote/verify (TEMPLATE + CLIENT).

function Resolve-YasnoProSuiteRoot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    $configured = [string]$env:YASNOPRO_SUITE_ROOT
    if ($configured.Trim()) {
        if (-not (Test-Path -LiteralPath $configured)) {
            throw "YASNOPRO_SUITE_ROOT path not found: $configured"
        }
        return (Resolve-Path -LiteralPath $configured).Path
    }

    $configCandidates = @(
        @{ Path = (Join-Path (Join-Path $RepoRoot "..") "config\yasnopro_suite.json"); Base = (Join-Path $RepoRoot "..") },
        @{ Path = (Join-Path $RepoRoot "config\yasnopro_suite.json"); Base = $RepoRoot }
    )
    foreach ($entry in $configCandidates) {
        $configPath = $entry.Path
        if (-not (Test-Path -LiteralPath $configPath)) {
            continue
        }
        try {
            $payload = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
            $raw = [string]$payload.suite_root
            if (-not $raw.Trim()) {
                $raw = [string]$payload.YASNOPRO_SUITE_ROOT
            }
            if ($raw.Trim()) {
                $candidate = $raw.Trim()
                if (-not [System.IO.Path]::IsPathRooted($candidate)) {
                    $candidate = Join-Path $entry.Base $candidate
                }
                if (Test-Path -LiteralPath $candidate) {
                    return (Resolve-Path -LiteralPath $candidate).Path
                }
                throw "suite_root from config is not a directory: $candidate"
            }
        }
        catch {
            throw "Invalid config/yasnopro_suite.json: $($_.Exception.Message)"
        }
    }

    return (Resolve-Path (Join-Path $RepoRoot "..")).Path
}

function Get-PhysicalRuntimeKindConfig {
    param(
        [ValidateSet("template", "client")]
        [string]$RuntimeKind
    )

    switch ($RuntimeKind) {
        "client" {
            return [ordered]@{
                Label           = "CLIENT"
                AppEnv          = "CLIENT"
                DatabaseName    = "yasnopro_client"
                StagingFrontend = "client"
                StagingBackend  = "client"
            }
        }
        default {
            return [ordered]@{
                Label           = "TEMPLATE"
                AppEnv          = "TEMPLATE"
                DatabaseName    = "yasnopro_template"
                StagingFrontend = "template"
                StagingBackend  = "template"
            }
        }
    }
}

function Get-PhysicalRuntimePaths {
    param(
        [string]$RepoRoot,
        [ValidateSet("template", "client")]
        [string]$RuntimeKind = "template"
    )

    $suiteRoot = Resolve-YasnoProSuiteRoot -RepoRoot $RepoRoot
    $runtimeRoot = Join-Path $suiteRoot "runtime\$RuntimeKind"
    return [ordered]@{
        RuntimeKind  = $RuntimeKind
        SuiteRoot    = $suiteRoot
        RuntimeRoot  = $runtimeRoot
        ReleasesDir  = Join-Path $runtimeRoot "releases"
        CurrentLink  = Join-Path $runtimeRoot "current"
        MountsRoot   = Join-Path $runtimeRoot "mounts"
        UploadsMount = Join-Path $runtimeRoot "mounts\uploads"
        DataMount    = Join-Path $runtimeRoot "mounts\data"
        LogsMount    = Join-Path $runtimeRoot "mounts\logs"
    }
}

function Ensure-PhysicalRuntimeMounts {
    param([hashtable]$Paths)

    foreach ($name in @("UploadsMount", "DataMount", "LogsMount")) {
        $dir = $Paths[$name]
        if (-not (Test-Path -LiteralPath $dir)) {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
        }
    }
}

function Ensure-PhysicalReleasesLayout {
    param([hashtable]$Paths)

    New-Item -ItemType Directory -Force -Path $Paths.ReleasesDir | Out-Null
    Ensure-PhysicalRuntimeMounts -Paths $Paths
}

function Get-PhysicalReleaseIds {
    param([string]$ReleasesDir)

    if (-not (Test-Path $ReleasesDir)) {
        return @()
    }
    return Get-ChildItem -Path $ReleasesDir -Directory |
        Where-Object { $_.Name -match '^release-\d+$' } |
        Sort-Object Name
}

function Get-NextPhysicalReleaseId {
    param([string]$ReleasesDir)

    $max = 0
    foreach ($item in Get-PhysicalReleaseIds -ReleasesDir $ReleasesDir) {
        if ($item.Name -match '^release-(\d+)$') {
            $value = [int]$Matches[1]
            if ($value -gt $max) {
                $max = $value
            }
        }
    }
    return ('release-{0:D3}' -f [int]($max + 1))
}

function Remove-PhysicalCurrentJunction {
    param(
        [string]$CurrentLink,
        [string]$RuntimeLabel
    )

    if (-not (Test-Path -LiteralPath $CurrentLink)) {
        return
    }

    cmd /c rmdir "$CurrentLink" 2>$null | Out-Null
    if (Test-Path -LiteralPath $CurrentLink) {
        throw "Failed to remove current junction (is $RuntimeLabel runtime in use?): $CurrentLink"
    }
}

function Set-PhysicalCurrentJunction {
    param(
        [string]$CurrentLink,
        [string]$ReleasePath,
        [string]$RuntimeLabel
    )

    $target = (Resolve-Path -LiteralPath $ReleasePath).Path
    Remove-PhysicalCurrentJunction -CurrentLink $CurrentLink -RuntimeLabel $RuntimeLabel
    New-Item -ItemType Junction -Path $CurrentLink -Target $target | Out-Null
}

function Get-FrontendBundleDigest {
    param([string]$FrontendArtifactDir)

    $assetsDir = Join-Path $FrontendArtifactDir "assets"
    if (-not (Test-Path $assetsDir)) {
        throw "assets directory not found: $assetsDir"
    }

    $bundle = Get-ChildItem -Path $assetsDir -File |
        Where-Object { $_.Name -like 'index-*.js' } |
        Select-Object -First 1
    if (-not $bundle) {
        throw "index-*.js bundle not found in $assetsDir"
    }

    $hash = Get-FileHash -Path $bundle.FullName -Algorithm SHA256
    return $hash.Hash.ToLowerInvariant()
}

function Invoke-BackendRuntimeFingerprint {
    param(
        [string]$RepoRoot,
        [string]$BackendRoot,
        [switch]$AsJson
    )

    $script = Join-Path $RepoRoot "scripts\runtime\backend_runtime_fingerprint.py"
    $python = Join-Path $RepoRoot "backend\.venv\Scripts\python.exe"
    if (-not (Test-Path -LiteralPath $python)) {
        throw "Python venv not found: $python"
    }

    $args = @($script, $BackendRoot)
    if ($AsJson) {
        $args += "--json"
    }
    $output = & $python @args
    if ($LASTEXITCODE -ne 0) {
        throw "backend_runtime_fingerprint.py failed"
    }
    if ($AsJson) {
        return $output | ConvertFrom-Json
    }
    return [string]$output
}

function Write-UnifiedReleaseManifest {
    param(
        [string]$ManifestReleaseDir,
        [string]$ManifestReleaseId,
        [string]$GitCommit,
        [string]$FrontendDigest,
        [object]$BackendFingerprint,
        [string]$RuntimeSlotKey = "",
        [int]$ReleasePackageId = 0,
        [string]$PackageKey = "",
        [int]$BuildId = 0,
        [string]$BuildKey = ""
    )

    if (-not $ManifestReleaseDir) {
        throw "ManifestReleaseDir is required"
    }

    $manifest = [ordered]@{
        release_id          = $ManifestReleaseId
        git_commit          = $GitCommit
        created_at          = (Get-Date).ToUniversalTime().ToString("o")
        frontend_digest     = $FrontendDigest
        backend_fingerprint = $BackendFingerprint
        artifacts           = [ordered]@{
            frontend = "frontend/"
            backend  = "backend/"
        }
    }

    if ($RuntimeSlotKey) {
        $manifest.manifest_schema_version = "1.1"
        $manifest.runtime_slot_key = $RuntimeSlotKey
    }

    $hasRegistryLinkage = ($ReleasePackageId -gt 0) -or $PackageKey -or ($BuildId -gt 0) -or $BuildKey
    if ($hasRegistryLinkage) {
        if ($ReleasePackageId -le 0 -or -not $PackageKey -or $BuildId -le 0 -or -not $BuildKey) {
            throw "Registry provenance requires ReleasePackageId, PackageKey, BuildId, and BuildKey together"
        }
        if (-not $RuntimeSlotKey) {
            throw "Registry provenance requires RuntimeSlotKey"
        }
        $manifest.release_package_id = [int]$ReleasePackageId
        $manifest.package_key = $PackageKey.Trim().ToUpper()
        $manifest.build_id = [int]$BuildId
        $manifest.build_key = $BuildKey.Trim().ToUpper()
    }

    $manifestPath = Join-Path $ManifestReleaseDir "manifest.json"
    $json = ($manifest | ConvertTo-Json -Depth 6)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($manifestPath, $json, $utf8NoBom)
}

function Resolve-PhysicalRuntimeSlotKey {
    param(
        [ValidateSet("template", "client")]
        [string]$RuntimeKind,
        [string]$RuntimeSlotKey = ""
    )

    if ($RuntimeSlotKey) {
        return $RuntimeSlotKey.Trim()
    }
    return $RuntimeKind
}

function Copy-PhysicalArtifactTree {
    param(
        [string]$SourceDir,
        [string]$DestinationDir
    )

    if (-not (Test-Path -LiteralPath $SourceDir)) {
        throw "Source artifact missing: $SourceDir"
    }
    if (Test-Path -LiteralPath $DestinationDir) {
        Remove-Item -LiteralPath $DestinationDir -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $DestinationDir | Out-Null
    Copy-Item -Path (Join-Path $SourceDir "*") -Destination $DestinationDir -Recurse -Force
}

function Copy-FilteredBackendApp {
    param(
        [string]$SourceAppDir,
        [string]$DestinationAppDir
    )

    if (Test-Path -LiteralPath $DestinationAppDir) {
        Remove-Item -LiteralPath $DestinationAppDir -Recurse -Force
    }

    $sourceRoot = (Resolve-Path -LiteralPath $SourceAppDir).Path.TrimEnd('\')
    Get-ChildItem -Path $SourceAppDir -Recurse -File -Filter "*.py" |
        Where-Object {
            $_.Name -notlike 'test_*' -and
            ($_.FullName -notmatch '[\\/]__pycache__[\\/]')
        } |
        ForEach-Object {
            $relative = $_.FullName.Substring($sourceRoot.Length).TrimStart('\')
            $target = Join-Path $DestinationAppDir $relative
            $targetParent = Split-Path -Parent $target
            if (-not (Test-Path -LiteralPath $targetParent)) {
                New-Item -ItemType Directory -Force -Path $targetParent | Out-Null
            }
            Copy-Item -LiteralPath $_.FullName -Destination $target -Force
        }
}

function Build-BackendRuntimeStaging {
    param(
        [string]$RepoRoot,
        [string]$StagingBackendDir
    )

    $backendDir = Join-Path $RepoRoot "backend"
    $sourceApp = Join-Path $backendDir "app"
    $requirements = Join-Path $backendDir "requirements.txt"

    if (-not (Test-Path -LiteralPath $sourceApp)) {
        throw "backend/app not found"
    }
    if (-not (Test-Path -LiteralPath $requirements)) {
        throw "backend/requirements.txt not found"
    }

    if (Test-Path -LiteralPath $StagingBackendDir) {
        Remove-Item -LiteralPath $StagingBackendDir -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $StagingBackendDir | Out-Null

    $stagingApp = Join-Path $StagingBackendDir "app"
    Copy-FilteredBackendApp -SourceAppDir $sourceApp -DestinationAppDir $stagingApp
    Copy-Item -LiteralPath $requirements -Destination (Join-Path $StagingBackendDir "requirements.txt") -Force
}

function Assert-UnifiedReleaseArtifacts {
    param(
        [string]$ReleasePath,
        [string]$CurrentLink
    )

    if (-not (Test-Path -LiteralPath $CurrentLink)) {
        throw "Verification failed: current junction is missing ($CurrentLink)"
    }

    $manifestPath = Join-Path $ReleasePath "manifest.json"
    $frontendIndex = Join-Path $ReleasePath "frontend\index.html"
    $backendMain = Join-Path $ReleasePath "backend\app\main.py"
    $backendRequirements = Join-Path $ReleasePath "backend\requirements.txt"

    foreach ($pair in @(
            @("manifest.json", $manifestPath),
            @("frontend/index.html", $frontendIndex),
            @("backend/app/main.py", $backendMain),
            @("backend/requirements.txt", $backendRequirements)
        )) {
        if (-not (Test-Path -LiteralPath $pair[1])) {
            throw "Verification failed: $($pair[0]) is missing ($($pair[1]))"
        }
    }

    try {
        $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    }
    catch {
        throw "Verification failed: manifest.json is not valid JSON ($manifestPath)"
    }

    $backendFp = $manifest.backend_fingerprint
    if ($null -eq $backendFp -or -not $backendFp.hash) {
        throw "Verification failed: manifest backend_fingerprint.hash is missing"
    }
    if (-not $manifest.frontend_digest) {
        throw "Verification failed: manifest frontend_digest is missing"
    }
}

function Invoke-PhysicalRuntimeVerification {
    param(
        [string]$RepoRoot,
        [ValidateSet("template", "client")]
        [string]$RuntimeKind = "template",
        [ValidateSet("backend", "full")]
        [string]$Scope = "full"
    )

    $kind = Get-PhysicalRuntimeKindConfig -RuntimeKind $RuntimeKind
    $Paths = Get-PhysicalRuntimePaths -RepoRoot $RepoRoot -RuntimeKind $RuntimeKind
    $CurrentLink = $Paths.CurrentLink
    $ManifestPath = Join-Path $CurrentLink "manifest.json"
    $BackendRoot = Join-Path $CurrentLink "backend"
    $BackendMain = Join-Path $BackendRoot "app\main.py"
    $BackendRequirements = Join-Path $BackendRoot "requirements.txt"
    $RuntimePathsFile = Join-Path $BackendRoot "app\core\runtime_paths.py"
    $FingerprintScript = Join-Path $RepoRoot "scripts\runtime\backend_runtime_fingerprint.py"
    $PythonExe = Join-Path $RepoRoot "backend\.venv\Scripts\python.exe"

    $checks = [System.Collections.Generic.List[object]]::new()
    $checks.Add(@{ name = "current exists"; ok = (Test-Path -LiteralPath $CurrentLink) })
    $checks.Add(@{ name = "manifest exists"; ok = (Test-Path -LiteralPath $ManifestPath) })
    $checks.Add(@{ name = "mounts/uploads exists"; ok = (Test-Path -LiteralPath $Paths.UploadsMount) })
    $checks.Add(@{ name = "mounts/data exists"; ok = (Test-Path -LiteralPath $Paths.DataMount) })
    $checks.Add(@{ name = "mounts/logs exists"; ok = (Test-Path -LiteralPath $Paths.LogsMount) })
    $checks.Add(@{ name = "backend/app/main.py exists"; ok = (Test-Path -LiteralPath $BackendMain) })
    $checks.Add(@{ name = "backend/requirements.txt exists"; ok = (Test-Path -LiteralPath $BackendRequirements) })
    $checks.Add(@{ name = "backend/app/core/runtime_paths.py exists"; ok = (Test-Path -LiteralPath $RuntimePathsFile) })

    $leakedTests = @()
    if (Test-Path -LiteralPath (Join-Path $BackendRoot "app")) {
        $leakedTests = Get-ChildItem -Path (Join-Path $BackendRoot "app") -Recurse -File -Filter "test_*.py" -ErrorAction SilentlyContinue
    }
    $checks.Add(@{ name = "no test_*.py in runtime backend"; ok = ($leakedTests.Count -eq 0) })

    if ($Scope -eq "full") {
        $indexPath = Join-Path $CurrentLink "frontend\index.html"
        $checks.Add(@{ name = "frontend/index.html exists"; ok = (Test-Path -LiteralPath $indexPath) })
    }

    $failed = @($checks | Where-Object { -not $_.ok })
    if ($failed.Count -gt 0) {
        foreach ($item in $failed) {
            Write-Error "$($kind.Label) runtime verification failed: $($item.name)"
        }
        throw "$($kind.Label) runtime verification failed ($Scope)"
    }

    if (-not (Test-Path -LiteralPath $PythonExe)) {
        throw "Python venv not found: $PythonExe"
    }

    & $PythonExe $FingerprintScript --verify-manifest $ManifestPath
    if ($LASTEXITCODE -ne 0) {
        throw "Backend fingerprint verification failed"
    }

    $databaseUrl = "postgresql://portal_user:portal_pass@localhost:5434/$($kind.DatabaseName)"
    $importCheck = @"
import os
import sys
sys.path.insert(0, r'$BackendRoot')
os.environ.setdefault('DATABASE_URL', '$databaseUrl')
os.environ.setdefault('APP_ENV', '$($kind.AppEnv)')
os.environ.setdefault('YASNOPRO_ENV', '$($kind.AppEnv)')
import app.main  # noqa: F401
print('import ok')
"@

    $importOutput = & $PythonExe -c $importCheck 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "import app.main failed: $importOutput"
    }

    return [ordered]@{
        RuntimeKind  = $RuntimeKind
        Scope        = $Scope
        CurrentLink  = $CurrentLink
        BackendRoot  = $BackendRoot
        ManifestPath = $ManifestPath
    }
}

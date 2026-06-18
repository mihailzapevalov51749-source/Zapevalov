#Requires -Version 5.1
<#
.SYNOPSIS
  Build TEMPLATE frontend into DEV staging and promote to sibling runtime slot.

.DESCRIPTION
  WI-RUNTIME-ISOLATION-03B:
  frontend/src -> build -> frontend/.build-staging/template
    -> ../runtime/template/releases/release-NNN/frontend
    -> junction ../runtime/template/current -> release-NNN

.PARAMETER SwitchToRelease
  Rollback/switch only: repoint current junction to an existing release id.

.PARAMETER ListReleases
  List available release folders.
#>
param(
    [string]$SwitchToRelease = "",
    [switch]$ListReleases
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$FrontendDir = Join-Path $RepoRoot "frontend"
$SuiteRoot = (Resolve-Path (Join-Path $RepoRoot "..")).Path
$RuntimeRoot = Join-Path $SuiteRoot "runtime\template"
$ReleasesDir = Join-Path $RuntimeRoot "releases"
$CurrentLink = Join-Path $RuntimeRoot "current"
$StagingDir = Join-Path $FrontendDir ".build-staging\template"
$ViteBin = Join-Path $FrontendDir "node_modules\vite\bin\vite.js"

function Ensure-RuntimeLayout {
    New-Item -ItemType Directory -Force -Path $ReleasesDir | Out-Null
}

function Get-ReleaseIds {
    if (-not (Test-Path $ReleasesDir)) {
        return @()
    }
    return Get-ChildItem -Path $ReleasesDir -Directory |
        Where-Object { $_.Name -match '^release-\d+$' } |
        Sort-Object Name
}

function Get-NextReleaseId {
    $max = 0
    foreach ($item in Get-ReleaseIds) {
        if ($item.Name -match '^release-(\d+)$') {
            $value = [int]$Matches[1]
            if ($value -gt $max) {
                $max = $value
            }
        }
    }
    $next = [int]($max + 1)
    return ('release-{0:D3}' -f $next)
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

function Remove-CurrentJunction {
    if (-not (Test-Path -LiteralPath $CurrentLink)) {
        return
    }

  cmd /c rmdir "$CurrentLink" 2>$null | Out-Null
    if (Test-Path -LiteralPath $CurrentLink) {
        throw "Failed to remove current junction (is TEMPLATE frontend running?): $CurrentLink"
    }
}

function Set-CurrentJunction {
    param([string]$ReleasePath)

    $target = (Resolve-Path -LiteralPath $ReleasePath).Path
    Remove-CurrentJunction
    New-Item -ItemType Junction -Path $CurrentLink -Target $target | Out-Null
}

function Write-ReleaseManifest {
    param(
        [string]$ReleasePath,
        [string]$ReleaseId,
        [string]$GitCommit,
        [string]$FrontendDigest
    )

    $manifest = [ordered]@{
        release_id       = $ReleaseId
        git_commit       = $GitCommit
        created_at       = (Get-Date).ToUniversalTime().ToString("o")
        frontend_digest  = $FrontendDigest
    }
    $manifestPath = Join-Path $ReleasePath "manifest.json"
    $json = ($manifest | ConvertTo-Json -Depth 4)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($manifestPath, $json, $utf8NoBom)
}

function Assert-RuntimeVerification {
    param([string]$ReleasePath)

    $manifestPath = Join-Path $ReleasePath "manifest.json"
    $indexPath = Join-Path $ReleasePath "frontend\index.html"

    if (-not (Test-Path -LiteralPath $CurrentLink)) {
        throw "Verification failed: current junction is missing ($CurrentLink)"
    }
    if (-not (Test-Path -LiteralPath $manifestPath)) {
        throw "Verification failed: manifest.json is missing ($manifestPath)"
    }
    if (-not (Test-Path -LiteralPath $indexPath)) {
        throw "Verification failed: frontend/index.html is missing ($indexPath)"
    }
}

Ensure-RuntimeLayout

if ($ListReleases) {
    Get-ReleaseIds | ForEach-Object { $_.Name }
    exit 0
}

if ($SwitchToRelease) {
    $releasePath = Join-Path $ReleasesDir $SwitchToRelease
    if (-not (Test-Path -LiteralPath $releasePath)) {
        throw "Release not found: $SwitchToRelease"
    }
    Set-CurrentJunction -ReleasePath $releasePath
    Assert-RuntimeVerification -ReleasePath $releasePath
    Write-Output "Switched current -> $SwitchToRelease"
    exit 0
}

if (-not (Test-Path -LiteralPath $ViteBin)) {
    throw "Vite not found. Run npm install in frontend/ first."
}

Push-Location $FrontendDir
try {
    & node $ViteBin build --mode template
    if ($LASTEXITCODE -ne 0) {
        throw "vite build --mode template failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath (Join-Path $StagingDir "index.html"))) {
    throw "Build staging output missing: $StagingDir\index.html"
}

$releaseId = Get-NextReleaseId
$releasePath = Join-Path $ReleasesDir $releaseId
$releaseFrontend = Join-Path $releasePath "frontend"

New-Item -ItemType Directory -Force -Path $releaseFrontend | Out-Null
Copy-Item -Path (Join-Path $StagingDir "*") -Destination $releaseFrontend -Recurse -Force

$digest = Get-FrontendBundleDigest -FrontendArtifactDir $releaseFrontend
$gitCommit = (& git -C $RepoRoot rev-parse HEAD).Trim()
if (-not $gitCommit) {
    throw "Unable to resolve git commit for $RepoRoot"
}

Write-ReleaseManifest -ReleasePath $releasePath -ReleaseId $releaseId -GitCommit $gitCommit -FrontendDigest $digest
Set-CurrentJunction -ReleasePath $releasePath
Assert-RuntimeVerification -ReleasePath $releasePath

Write-Output "Promoted $releaseId"
Write-Output "Runtime frontend: $(Join-Path $CurrentLink 'frontend')"
Write-Output "Manifest: $(Join-Path $CurrentLink 'manifest.json')"

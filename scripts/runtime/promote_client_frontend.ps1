#Requires -Version 5.1
<#
.SYNOPSIS
  Build CLIENT frontend and promote unified CLIENT runtime release.
#>
param(
    [string]$SwitchToRelease = "",
    [switch]$ListReleases,
    [string]$RuntimeSlotKey = "",
    [int]$ReleasePackageId = 0,
    [string]$PackageKey = "",
    [int]$BuildId = 0,
    [string]$BuildKey = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
. (Join-Path $ScriptDir "_physical_runtime_common.ps1")

$kind = Get-PhysicalRuntimeKindConfig -RuntimeKind client
$FrontendDir = Join-Path $RepoRoot "frontend"
$StagingDir = Join-Path $FrontendDir ".build-staging\client"
$ViteBin = Join-Path $FrontendDir "node_modules\vite\bin\vite.js"
$Paths = Get-PhysicalRuntimePaths -RepoRoot $RepoRoot -RuntimeKind client

Ensure-PhysicalReleasesLayout -Paths $Paths

if ($ListReleases) {
    Get-PhysicalReleaseIds -ReleasesDir $Paths.ReleasesDir | ForEach-Object { $_.Name }
    exit 0
}

if ($SwitchToRelease) {
    $targetReleaseDir = Join-Path $Paths.ReleasesDir $SwitchToRelease
    if (-not (Test-Path -LiteralPath $targetReleaseDir)) {
        throw "Release not found: $SwitchToRelease"
    }
    Assert-UnifiedReleaseArtifacts -ReleasePath $targetReleaseDir -CurrentLink $Paths.CurrentLink
    Set-PhysicalCurrentJunction -CurrentLink $Paths.CurrentLink -ReleasePath $targetReleaseDir -RuntimeLabel $kind.Label
    Assert-UnifiedReleaseArtifacts -ReleasePath $targetReleaseDir -CurrentLink $Paths.CurrentLink
    Write-Output "Switched current -> $SwitchToRelease"
    exit 0
}

if (-not (Test-Path -LiteralPath $ViteBin)) {
    throw "Vite not found. Run npm install in frontend/ first."
}

Push-Location $FrontendDir
try {
    & node $ViteBin build --mode client
    if ($LASTEXITCODE -ne 0) {
        throw "vite build --mode client failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath (Join-Path $StagingDir "index.html"))) {
    throw "Build staging output missing: $StagingDir\index.html"
}

$targetReleaseId = Get-NextPhysicalReleaseId -ReleasesDir $Paths.ReleasesDir
$targetReleaseDir = Join-Path $Paths.ReleasesDir $targetReleaseId
$releaseFrontend = Join-Path $targetReleaseDir "frontend"
$releaseBackend = Join-Path $targetReleaseDir "backend"

New-Item -ItemType Directory -Force -Path $releaseFrontend | Out-Null
Copy-Item -Path (Join-Path $StagingDir "*") -Destination $releaseFrontend -Recurse -Force

$currentBackend = Join-Path $Paths.CurrentLink "backend"
if (Test-Path -LiteralPath (Join-Path $currentBackend "app\main.py")) {
    Copy-PhysicalArtifactTree -SourceDir $currentBackend -DestinationDir $releaseBackend
    $backendFingerprint = Invoke-BackendRuntimeFingerprint -RepoRoot $RepoRoot -BackendRoot $releaseBackend -AsJson
}
else {
    Write-Warning "No backend artifact in current release; promote backend after frontend with promote_client_backend.ps1"
    $backendFingerprint = [ordered]@{
        version               = "1"
        hash                  = ""
        production_file_count = 0
    }
}

$frontendDigest = Get-FrontendBundleDigest -FrontendArtifactDir $releaseFrontend
$gitCommit = (& git -C $RepoRoot rev-parse HEAD).Trim()
if (-not $gitCommit) {
    throw "Unable to resolve git commit for $RepoRoot"
}

$slotKey = Resolve-PhysicalRuntimeSlotKey -RuntimeKind client -RuntimeSlotKey $RuntimeSlotKey

Write-UnifiedReleaseManifest `
    -ManifestReleaseDir $targetReleaseDir `
    -ManifestReleaseId $targetReleaseId `
    -GitCommit $gitCommit `
    -FrontendDigest $frontendDigest `
    -BackendFingerprint $backendFingerprint `
    -RuntimeSlotKey $slotKey `
    -ReleasePackageId $ReleasePackageId `
    -PackageKey $PackageKey `
    -BuildId $BuildId `
    -BuildKey $BuildKey

Set-PhysicalCurrentJunction -CurrentLink $Paths.CurrentLink -ReleasePath $targetReleaseDir -RuntimeLabel $kind.Label

if (Test-Path -LiteralPath (Join-Path $releaseBackend "app\main.py")) {
    Assert-UnifiedReleaseArtifacts -ReleasePath $targetReleaseDir -CurrentLink $Paths.CurrentLink
}

Write-Output "Promoted $targetReleaseId"
Write-Output "Runtime frontend: $(Join-Path $Paths.CurrentLink 'frontend')"
if ($backendFingerprint.hash) {
    Write-Output "Runtime backend: $(Join-Path $Paths.CurrentLink 'backend')"
    Write-Output "Backend fingerprint: $($backendFingerprint.hash)"
}
Write-Output "Manifest: $(Join-Path $Paths.CurrentLink 'manifest.json')"

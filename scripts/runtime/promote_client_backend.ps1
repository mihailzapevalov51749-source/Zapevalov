#Requires -Version 5.1
<#
.SYNOPSIS
  Stage monorepo backend and promote unified CLIENT runtime release.
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
$Paths = Get-PhysicalRuntimePaths -RepoRoot $RepoRoot -RuntimeKind client
$StagingBackendDir = Join-Path $RepoRoot "backend\.build-staging\client\backend"

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

$currentFrontend = Join-Path $Paths.CurrentLink "frontend"
if (-not (Test-Path -LiteralPath (Join-Path $currentFrontend "index.html"))) {
    throw @"
Unified release requires frontend artifact in current release.
Run first:
  .\scripts\runtime\promote_client_frontend.ps1
"@
}

Build-BackendRuntimeStaging -RepoRoot $RepoRoot -StagingBackendDir $StagingBackendDir

$targetReleaseId = Get-NextPhysicalReleaseId -ReleasesDir $Paths.ReleasesDir
$targetReleaseDir = Join-Path $Paths.ReleasesDir $targetReleaseId
$releaseBackend = Join-Path $targetReleaseDir "backend"
$releaseFrontend = Join-Path $targetReleaseDir "frontend"

New-Item -ItemType Directory -Force -Path $releaseBackend | Out-Null
Copy-Item -Path (Join-Path $StagingBackendDir "*") -Destination $releaseBackend -Recurse -Force
Copy-PhysicalArtifactTree -SourceDir $currentFrontend -DestinationDir $releaseFrontend

$backendFingerprint = Invoke-BackendRuntimeFingerprint -RepoRoot $RepoRoot -BackendRoot $releaseBackend -AsJson
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
Assert-UnifiedReleaseArtifacts -ReleasePath $targetReleaseDir -CurrentLink $Paths.CurrentLink

Write-Output "Promoted $targetReleaseId"
Write-Output "Runtime backend: $(Join-Path $Paths.CurrentLink 'backend')"
Write-Output "Runtime frontend: $(Join-Path $Paths.CurrentLink 'frontend')"
Write-Output "Backend fingerprint: $($backendFingerprint.hash)"
Write-Output "Manifest: $(Join-Path $Paths.CurrentLink 'manifest.json')"

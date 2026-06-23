#Requires -Version 5.1
<#
.SYNOPSIS
  Stage monorepo backend and promote unified TEMPLATE runtime release.

.DESCRIPTION
  WI-RT-014C:
  backend/app -> backend/.build-staging/template/backend
    -> ../runtime/template/releases/release-NNN/backend
    + forward-copy frontend/ from current release (unified release policy)
    -> junction ../runtime/template/current -> release-NNN

.PARAMETER SwitchToRelease
  Rollback/switch only: repoint current junction to an existing release id.

.PARAMETER ListReleases
  List available release folders.
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
. (Join-Path $ScriptDir "_template_runtime_common.ps1")

$Paths = Get-TemplateRuntimePaths -RepoRoot $RepoRoot
$StagingBackendDir = Join-Path $RepoRoot "backend\.build-staging\template\backend"

Ensure-TemplateReleasesLayout -Paths $Paths

if ($ListReleases) {
    Get-TemplateReleaseIds -ReleasesDir $Paths.ReleasesDir | ForEach-Object { $_.Name }
    exit 0
}

if ($SwitchToRelease) {
    $releasePath = Join-Path $Paths.ReleasesDir $SwitchToRelease
    if (-not (Test-Path -LiteralPath $releasePath)) {
        throw "Release not found: $SwitchToRelease"
    }
    Assert-UnifiedReleaseArtifacts -ReleasePath $releasePath -CurrentLink $Paths.CurrentLink
    Set-TemplateCurrentJunction -CurrentLink $Paths.CurrentLink -ReleasePath $releasePath
    Assert-UnifiedReleaseArtifacts -ReleasePath $releasePath -CurrentLink $Paths.CurrentLink
    Write-Output "Switched current -> $SwitchToRelease"
    exit 0
}

$currentFrontend = Join-Path $Paths.CurrentLink "frontend"
if (-not (Test-Path -LiteralPath (Join-Path $currentFrontend "index.html"))) {
    throw @"
Unified release requires frontend artifact in current release.
Run first:
  .\scripts\runtime\promote_template_frontend.ps1
"@
}

Build-BackendRuntimeStaging -RepoRoot $RepoRoot -StagingBackendDir $StagingBackendDir

$releaseId = Get-NextTemplateReleaseId -ReleasesDir $Paths.ReleasesDir
$releasePath = Join-Path $Paths.ReleasesDir $releaseId
$releaseBackend = Join-Path $releasePath "backend"
$releaseFrontend = Join-Path $releasePath "frontend"

New-Item -ItemType Directory -Force -Path $releaseBackend | Out-Null
Copy-Item -Path (Join-Path $StagingBackendDir "*") -Destination $releaseBackend -Recurse -Force
Copy-TemplateArtifactTree -SourceDir $currentFrontend -DestinationDir $releaseFrontend

$backendFingerprint = Invoke-BackendRuntimeFingerprint -RepoRoot $RepoRoot -BackendRoot $releaseBackend -AsJson
$frontendDigest = Get-FrontendBundleDigest -FrontendArtifactDir $releaseFrontend
$gitCommit = (& git -C $RepoRoot rev-parse HEAD).Trim()
if (-not $gitCommit) {
    throw "Unable to resolve git commit for $RepoRoot"
}

$slotKey = Resolve-PhysicalRuntimeSlotKey -RuntimeKind template -RuntimeSlotKey $RuntimeSlotKey

Write-UnifiedReleaseManifest `
    -ManifestReleaseDir $releasePath `
    -ManifestReleaseId $releaseId `
    -GitCommit $gitCommit `
    -FrontendDigest $frontendDigest `
    -BackendFingerprint $backendFingerprint `
    -RuntimeSlotKey $slotKey `
    -ReleasePackageId $ReleasePackageId `
    -PackageKey $PackageKey `
    -BuildId $BuildId `
    -BuildKey $BuildKey

Set-TemplateCurrentJunction -CurrentLink $Paths.CurrentLink -ReleasePath $releasePath
Assert-UnifiedReleaseArtifacts -ReleasePath $releasePath -CurrentLink $Paths.CurrentLink

Write-Output "Promoted $releaseId"
Write-Output "Runtime backend: $(Join-Path $Paths.CurrentLink 'backend')"
Write-Output "Runtime frontend: $(Join-Path $Paths.CurrentLink 'frontend')"
Write-Output "Backend fingerprint: $($backendFingerprint.hash)"
Write-Output "Manifest: $(Join-Path $Paths.CurrentLink 'manifest.json')"

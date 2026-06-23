#Requires -Version 5.1
<#
.SYNOPSIS
  Materialize unified TEMPLATE runtime release without switching current junction.

.DESCRIPTION
  WI-IMPL-007 orchestrator companion script. Creates
  runtime/template/releases/release-NNN/ with frontend, backend, manifest.json.
  Does NOT repoint runtime/template/current (activation is WI-IMPL-008).

.PARAMETER ReleasePackageId
  Registry release package id for manifest provenance.

.PARAMETER PackageKey
  Registry package key.

.PARAMETER BuildId
  Registry build id.

.PARAMETER BuildKey
  Registry build key.

.PARAMETER GitCommit
  Optional git commit override (defaults to repo HEAD).

.PARAMETER ListReleases
  List existing release folders.
#>
param(
    [int]$ReleasePackageId = 0,
    [string]$PackageKey = "",
    [int]$BuildId = 0,
    [string]$BuildKey = "",
    [string]$GitCommit = "",
    [switch]$ListReleases
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
. (Join-Path $ScriptDir "_template_runtime_common.ps1")

$Paths = Get-TemplateRuntimePaths -RepoRoot $RepoRoot
$StagingBackendDir = Join-Path $RepoRoot "backend\.build-staging\template\backend"
$StagingFrontendDir = Join-Path $RepoRoot "frontend\.build-staging\template"

Ensure-TemplateReleasesLayout -Paths $Paths

if ($ListReleases) {
    Get-TemplateReleaseIds -ReleasesDir $Paths.ReleasesDir | ForEach-Object { $_.Name }
    exit 0
}

if ($ReleasePackageId -le 0 -or -not $PackageKey -or $BuildId -le 0 -or -not $BuildKey) {
    throw "Registry provenance requires ReleasePackageId, PackageKey, BuildId, BuildKey"
}

$frontendSource = $StagingFrontendDir
if (-not (Test-Path -LiteralPath (Join-Path $frontendSource "index.html"))) {
    $currentFrontend = Join-Path $Paths.CurrentLink "frontend"
    if (Test-Path -LiteralPath (Join-Path $currentFrontend "index.html")) {
        $frontendSource = $currentFrontend
    }
    else {
        throw @"
Frontend artifact missing. Build template frontend staging first:
  .\scripts\runtime\promote_template_frontend.ps1
"@
    }
}

Build-BackendRuntimeStaging -RepoRoot $RepoRoot -StagingBackendDir $StagingBackendDir

$releaseId = Get-NextTemplateReleaseId -ReleasesDir $Paths.ReleasesDir
$releasePath = Join-Path $Paths.ReleasesDir $releaseId
$releaseBackend = Join-Path $releasePath "backend"
$releaseFrontend = Join-Path $releasePath "frontend"

New-Item -ItemType Directory -Force -Path $releaseBackend | Out-Null
Copy-Item -Path (Join-Path $StagingBackendDir "*") -Destination $releaseBackend -Recurse -Force
Copy-TemplateArtifactTree -SourceDir $frontendSource -DestinationDir $releaseFrontend

$backendFingerprint = Invoke-BackendRuntimeFingerprint -RepoRoot $RepoRoot -BackendRoot $releaseBackend -AsJson
$frontendDigest = Get-FrontendBundleDigest -FrontendArtifactDir $releaseFrontend

if ($GitCommit) {
    $gitCommit = $GitCommit.Trim()
}
else {
    $gitCommit = (& git -C $RepoRoot rev-parse HEAD).Trim()
}
if (-not $gitCommit) {
    throw "Unable to resolve git commit for $RepoRoot"
}

$slotKey = Resolve-PhysicalRuntimeSlotKey -RuntimeKind template -RuntimeSlotKey "template"

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

# Verify artifacts only — no Set-TemplateCurrentJunction (WI-IMPL-007)
$manifestPath = Join-Path $releasePath "manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "manifest.json missing after materialize"
}

Write-Output "Materialized $releaseId"
Write-Output "Release path: $releasePath"
Write-Output "Manifest: $manifestPath"
Write-Output "NOTE: current junction unchanged (activation is WI-IMPL-008)"

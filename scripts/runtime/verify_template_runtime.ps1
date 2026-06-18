#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$SuiteRoot = (Resolve-Path (Join-Path $RepoRoot "..")).Path
$RuntimeRoot = Join-Path $SuiteRoot "runtime\template"
$CurrentLink = Join-Path $RuntimeRoot "current"
$ManifestPath = Join-Path $CurrentLink "manifest.json"
$IndexPath = Join-Path $CurrentLink "frontend\index.html"

$checks = @(
    @{ name = "current exists"; ok = (Test-Path -LiteralPath $CurrentLink) },
    @{ name = "manifest exists"; ok = (Test-Path -LiteralPath $ManifestPath) },
    @{ name = "index.html exists"; ok = (Test-Path -LiteralPath $IndexPath) }
)

$failed = $checks | Where-Object { -not $_.ok }
if ($failed.Count -gt 0) {
    $failed | ForEach-Object { Write-Error "TEMPLATE runtime verification failed: $($_.name)" }
    Write-Error "Run: .\scripts\runtime\promote_template_frontend.ps1"
    exit 1
}

Write-Output "TEMPLATE runtime verification passed"
Write-Output "current=$CurrentLink"
Write-Output "manifest=$ManifestPath"
Write-Output "frontend=$IndexPath"
exit 0

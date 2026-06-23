#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
. (Join-Path $ScriptDir "_template_runtime_common.ps1")

try {
    $result = Invoke-TemplateRuntimeVerification -RepoRoot $RepoRoot -Scope backend
}
catch {
    Write-Error $_.Exception.Message
    Write-Error "Run: .\scripts\runtime\promote_template_backend.ps1"
    exit 1
}

Write-Output "TEMPLATE backend runtime verification passed"
Write-Output "current=$($result.CurrentLink)"
Write-Output "backend=$($result.BackendRoot)"
Write-Output "manifest=$($result.ManifestPath)"
exit 0

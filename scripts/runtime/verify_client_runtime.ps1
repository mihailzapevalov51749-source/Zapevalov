#Requires -Version 5.1

$ErrorActionPreference = "Stop"



$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

. (Join-Path $ScriptDir "_physical_runtime_common.ps1")



try {

    $result = Invoke-PhysicalRuntimeVerification -RepoRoot $RepoRoot -RuntimeKind client -Scope full

}

catch {

    Write-Error $_.Exception.Message

    Write-Error "Run: .\scripts\runtime\promote_client_backend.ps1"

    exit 1

}



$indexPath = Join-Path $result.CurrentLink "frontend\index.html"

Write-Output "CLIENT runtime verification passed"

Write-Output "current=$($result.CurrentLink)"

Write-Output "manifest=$($result.ManifestPath)"

Write-Output "frontend=$indexPath"

Write-Output "backend=$($result.BackendRoot)"

exit 0



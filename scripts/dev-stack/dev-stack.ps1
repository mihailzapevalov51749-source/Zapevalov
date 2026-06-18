#Requires -Version 5.1
<#
.SYNOPSIS
  Local dev stack manager for DEV / TEMPLATE / CLIENT environments.

.DESCRIPTION
  Thin PowerShell wrapper around scripts/dev-stack/dev_stack.py.

.EXAMPLE
  .\scripts\dev-stack\dev-stack.ps1 start

.EXAMPLE
  .\scripts\dev-stack\dev-stack.ps1 stop

.EXAMPLE
  .\scripts\dev-stack\dev-stack.ps1 status
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("start", "stop", "status")]
    [string]$Command = "status"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$PythonScript = Join-Path $ScriptDir "dev_stack.py"
$VenvPython = Join-Path $RepoRoot "backend\.venv\Scripts\python.exe"

if (Test-Path $VenvPython) {
    $Python = $VenvPython
}
else {
    $Python = "python"
}

& $Python $PythonScript $Command --repo-root $RepoRoot
exit $LASTEXITCODE

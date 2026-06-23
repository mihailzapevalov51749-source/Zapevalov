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

.EXAMPLE
  .\scripts\dev-stack\dev-stack.ps1 start template

.EXAMPLE
  .\scripts\dev-stack\dev-stack.ps1 stop dev
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("start", "stop", "status", "restart")]
    [string]$Command = "status",

    [Parameter(Position = 1)]
    [ValidateSet("dev", "template", "client")]
    [string]$Environment
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

$pythonArgs = @($Command)
if ($Environment) {
    $pythonArgs += $Environment
}
$pythonArgs += @("--repo-root", $RepoRoot)

& $Python $PythonScript @pythonArgs
exit $LASTEXITCODE

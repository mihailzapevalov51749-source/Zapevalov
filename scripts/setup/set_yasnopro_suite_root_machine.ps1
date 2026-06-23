#Requires -RunAsAdministrator
<#
.SYNOPSIS
  WI-INFRA-ROOT-004 — set machine-scope YASNOPRO_SUITE_ROOT (persists across reboot).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/setup/set_yasnopro_suite_root_machine.ps1
#>
param(
    [string]$SuiteRoot = 'E:\YasnoPro'
)

if (-not (Test-Path -LiteralPath $SuiteRoot)) {
    throw "Suite root directory does not exist: $SuiteRoot"
}

[System.Environment]::SetEnvironmentVariable('YASNOPRO_SUITE_ROOT', $SuiteRoot, 'Machine')

# Broadcast WM_SETTINGCHANGE so new processes pick up the variable without reboot.
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32Env {
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessageTimeout(
        IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
        uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
}
"@

$HWND_BROADCAST = [IntPtr]0xffff
$WM_SETTINGCHANGE = 0x001A
$result = [UIntPtr]::Zero
[void][Win32Env]::SendMessageTimeout(
    $HWND_BROADCAST, $WM_SETTINGCHANGE, [UIntPtr]::Zero, 'Environment',
    2, 5000, [ref]$result
)

$machine = [System.Environment]::GetEnvironmentVariable('YASNOPRO_SUITE_ROOT', 'Machine')
Write-Host "YASNOPRO_SUITE_ROOT (Machine) = $machine"
if ($machine -ne $SuiteRoot) {
    throw "Machine variable was not set correctly."
}

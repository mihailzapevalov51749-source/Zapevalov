# Backward-compatible TEMPLATE wrappers over _physical_runtime_common.ps1.

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $ScriptDir "_physical_runtime_common.ps1")

function Get-TemplateRuntimePaths {
    param([string]$RepoRoot)
    return Get-PhysicalRuntimePaths -RepoRoot $RepoRoot -RuntimeKind template
}

function Ensure-TemplateRuntimeMounts {
    param([hashtable]$Paths)
    Ensure-PhysicalRuntimeMounts -Paths $Paths
}

function Ensure-TemplateReleasesLayout {
    param([hashtable]$Paths)
    Ensure-PhysicalReleasesLayout -Paths $Paths
}

function Get-TemplateReleaseIds {
    param([string]$ReleasesDir)
    return Get-PhysicalReleaseIds -ReleasesDir $ReleasesDir
}

function Get-NextTemplateReleaseId {
    param([string]$ReleasesDir)
    return Get-NextPhysicalReleaseId -ReleasesDir $ReleasesDir
}

function Remove-TemplateCurrentJunction {
    param([string]$CurrentLink)
    Remove-PhysicalCurrentJunction -CurrentLink $CurrentLink -RuntimeLabel "TEMPLATE"
}

function Set-TemplateCurrentJunction {
    param(
        [string]$CurrentLink,
        [string]$ReleasePath
    )
    Set-PhysicalCurrentJunction -CurrentLink $CurrentLink -ReleasePath $ReleasePath -RuntimeLabel "TEMPLATE"
}

function Copy-TemplateArtifactTree {
    param(
        [string]$SourceDir,
        [string]$DestinationDir
    )
    Copy-PhysicalArtifactTree -SourceDir $SourceDir -DestinationDir $DestinationDir
}

function Invoke-TemplateRuntimeVerification {
    param(
        [string]$RepoRoot,
        [ValidateSet("backend", "full")]
        [string]$Scope = "full"
    )
    return Invoke-PhysicalRuntimeVerification -RepoRoot $RepoRoot -RuntimeKind template -Scope $Scope
}

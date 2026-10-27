$ErrorActionPreference = 'Stop'
$serviceInfo = Join-Path $PSScriptRoot 'runtime\service.json'
if (-not (Test-Path -LiteralPath $serviceInfo)) { exit 0 }
$info = Get-Content -LiteralPath $serviceInfo -Raw | ConvertFrom-Json
$servicePid = [int]$info.pid
$processInfo = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $servicePid)
$expectedServer = Join-Path $PSScriptRoot 'server.mjs'
if ($processInfo -and $processInfo.Name -eq 'node.exe' -and $processInfo.CommandLine.IndexOf($expectedServer, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
    Stop-Process -Id $servicePid
}

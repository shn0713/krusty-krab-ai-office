param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$appRoot = $PSScriptRoot
$runtimeDir = Join-Path $appRoot 'runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
$nodePath = if ($nodeCmd) { $nodeCmd.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js is required. Install Node.js LTS, then open this launcher again.' }
foreach ($servicePort in 4318..4327) {
    $serviceUrl = 'http://127.0.0.1:' + $servicePort
    try {
        $existing = Invoke-RestMethod -Uri ($serviceUrl + '/api/status') -TimeoutSec 1
        if ($existing.app -eq 'krusty-agent-office-v1') { if (-not $NoBrowser) { Start-Process $serviceUrl }; exit 0 }
        continue
    } catch { }
    $env:PORT = [string]$servicePort
    $serverPath = Join-Path $appRoot 'server.mjs'
    $service = Start-Process -FilePath $nodePath -ArgumentList @('"' + $serverPath + '"') -WorkingDirectory $appRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir 'server.log') -RedirectStandardError (Join-Path $runtimeDir 'error.log')
    for ($attempt = 0; $attempt -lt 25; $attempt++) {
        Start-Sleep -Milliseconds 200
        try {
            $ready = Invoke-RestMethod -Uri ($serviceUrl + '/api/status') -TimeoutSec 1
            if ($ready.app -eq 'krusty-agent-office-v1') {
                @{ pid = $service.Id; port = $servicePort; root = $appRoot } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimeDir 'service.json') -Encoding UTF8
                if (-not $NoBrowser) { Start-Process $serviceUrl }
                exit 0
            }
        } catch { }
        if ($service.HasExited) { break }
    }
    if (-not $service.HasExited) { $service.Kill() }
}
throw 'The restaurant could not start. Read runtime/error.log for details.'

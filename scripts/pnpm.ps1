$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$nodeExe = Join-Path $repoRoot '.tools\node-v24.15.0-win-x64\node.exe'
$pnpmCli = Join-Path $repoRoot '.tools\pnpm\node_modules\pnpm\bin\pnpm.cjs'

if (-not (Test-Path $nodeExe)) {
  throw "Node local nao encontrado em $nodeExe"
}

if (-not (Test-Path $pnpmCli)) {
  throw "pnpm local nao encontrado em $pnpmCli"
}

& $nodeExe $pnpmCli @args
exit $LASTEXITCODE

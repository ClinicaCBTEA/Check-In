$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$supabaseExe = Join-Path $repoRoot 'node_modules\supabase\bin\supabase.exe'

if (Test-Path $supabaseExe) {
  & $supabaseExe @args
  exit $LASTEXITCODE
}

& npm exec --yes supabase@2.98.2 -- @args
exit $LASTEXITCODE

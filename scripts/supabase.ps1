$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$supabaseExe = Join-Path $repoRoot 'node_modules\supabase\bin\supabase.exe'

if (-not (Test-Path $supabaseExe)) {
  throw "Supabase CLI local nao encontrado em $supabaseExe"
}

& $supabaseExe @args
exit $LASTEXITCODE

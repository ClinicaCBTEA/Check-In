@echo off
setlocal
set "ROOT=%~dp0.."
if exist "%ROOT%\node_modules\supabase\bin\supabase.exe" (
  "%ROOT%\node_modules\supabase\bin\supabase.exe" %*
) else (
  npm exec --yes supabase@2.98.2 -- %*
)

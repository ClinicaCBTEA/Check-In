@echo off
setlocal
set "ROOT=%~dp0.."
"%ROOT%\node_modules\supabase\bin\supabase.exe" %*

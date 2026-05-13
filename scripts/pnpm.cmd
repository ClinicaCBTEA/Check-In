@echo off
setlocal
set "ROOT=%~dp0.."
"%ROOT%\.tools\node-v24.15.0-win-x64\node.exe" "%ROOT%\.tools\pnpm\node_modules\pnpm\bin\pnpm.cjs" %*

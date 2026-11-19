@echo off
setlocal
cd /d "%~dp0.."
echo ============================================
echo FC Edinet v2.30.27 - Stability QA Hotfix
echo ============================================
node "%~dp0fix-performance-stability-qa.mjs"
if errorlevel 1 (
  echo.
  echo HOTFIX FAILED. No deployment was started.
  pause
  exit /b 1
)
echo.
echo Hotfix finished. Run DEPLOY_FC_EDINET.bat in the project root.
pause
endlocal

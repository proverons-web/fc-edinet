@echo off
setlocal
cd /d "%~dp0.."
echo ==============================================
echo FC Edinet v2.30.27 - Production Safety QA Fix
echo ==============================================
node "%~dp0fix-production-safety-qa.mjs"
if errorlevel 1 (
  echo.
  echo HOTFIX FAILED. Deployment was NOT started.
  pause
  exit /b 1
)
echo.
echo The documentation test passed. Now run DEPLOY_FC_EDINET.bat from project root.
pause
endlocal

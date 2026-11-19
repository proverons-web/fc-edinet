@echo off
setlocal
cd /d "%~dp0.."
echo ============================================
echo FC Edinet v2.30.27 Club History QA Hotfix
 echo ============================================
node "%~dp0fix-club-history-qa.mjs"
if errorlevel 1 (
  echo.
  echo HOTFIX FAILED. No deployment was started.
  pause
  exit /b 1
)
echo.
echo Hotfix finished. Run npm run qa:user-roles, then DEPLOY_FC_EDINET.bat from project root.
pause
endlocal

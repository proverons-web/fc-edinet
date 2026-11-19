@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."
echo ===============================================
echo FC EDINET v2.30.27 - TYPECHECK CLEANUP
echo ===============================================
node "%~dp0fix-typecheck-extra-files.mjs"
if errorlevel 1 (
  echo ERROR: Cannot safely move upgrade kit duplicates.
  echo Nothing was deployed. Read the message above.
  pause
  exit /b 1
)
echo.
echo [VERIFY] Checking TypeScript with original project settings...
call npm run typecheck
if errorlevel 1 (
  echo.
  echo TYPECHECK FAILED: Do not start DEPLOY yet.
  echo Save the new error output for review.
  pause
  exit /b 1
)
echo.
echo PASS TypeScript: ready to rerun DEPLOY_FC_EDINET.bat from the project root.
pause
endlocal

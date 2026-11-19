@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."
echo =================================================
echo  FC EDINET v2.30.27 - ROLE PATCH
 echo =================================================
node "UPDATE_FC_EDINET_v2.30.27\apply.mjs"
if errorlevel 1 (
  echo ERROR: No deploy has been started. Check details above.
  pause
  exit /b 1
)
echo.
echo Files updated locally. Complete SQL migration 085 and server key configuration.
echo Then run DEPLOY_FC_EDINET.bat from this project directory.
pause
endlocal

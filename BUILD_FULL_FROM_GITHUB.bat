@echo off
chcp 65001 >nul
setlocal
set "KIT=%~dp0"
set "ROOT=%KIT%.."
set "TARGET=%ROOT%\fc-edinet-v2.30.27"
echo FC EDINET v2.30.27 - COMPLETE WORKING SOURCE FROM VERIFIED GITHUB BASE
if exist "%TARGET%" (
 echo ERROR: Folder already exists: %TARGET%
 echo Nothing has been overwritten.
 pause
 exit /b 1
)
echo 1. Cloning official FC Edinet repository...
git clone https://github.com/proverons-web/fc-edinet.git "%TARGET%"
if errorlevel 1 goto :error
echo 2. Checking out reviewed v2.30.26 commit...
git -C "%TARGET%" checkout f8e30f0ad90c62bc9fc97363b55827cde7a71e16
if errorlevel 1 goto :error
echo 3. Copying update files into the new project...
xcopy "%KIT%*" "%TARGET%\UPDATE_FC_EDINET_v2.30.27\" /E /I /Q /Y >nul
if errorlevel 1 goto :error
echo 4. Applying safe source changes...
node "%TARGET%\UPDATE_FC_EDINET_v2.30.27\apply.mjs"
if errorlevel 1 goto :error
echo.
echo FULL SOURCE READY: %TARGET%
echo Remember: copy .env.local privately, run SQL 085 after backup, then DEPLOY_FC_EDINET.bat.
pause
exit /b 0
:error
echo ERROR: Build aborted. Production and Supabase remain unchanged.
pause
exit /b 1

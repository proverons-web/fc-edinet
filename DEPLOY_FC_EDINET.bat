@echo off
setlocal EnableExtensions
title FC Edinet - Deploy

cd /d "%~dp0"

echo.
echo ==========================================
echo        FC EDINET - DEPLOY
echo ==========================================
echo.
echo Project:
echo %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo Install Node.js and try again.
    goto :fail
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found.
    goto :fail
)

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git not found.
    goto :fail
)

for /f "delims=" %%V in ('node -p "require('./package.json').version"') do set "VERSION=%%V"

echo Version: %VERSION%
echo.

echo [1/8] Installing dependencies...
call npm install
if errorlevel 1 goto :fail

echo.
echo [2/8] Running deploy check and production build...
call npm run deploy:check
if errorlevel 1 goto :fail

echo.
echo [3/8] Preparing Git repository...
if not exist ".git" (
    git init
    if errorlevel 1 goto :fail
)

echo.
echo [4/8] Checking GitHub remote...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin https://github.com/proverons-web/fc-edinet.git
    if errorlevel 1 goto :fail
) else (
    git remote set-url origin https://github.com/proverons-web/fc-edinet.git
    if errorlevel 1 goto :fail
)

echo.
echo [5/8] Fetching current main from GitHub...
git fetch origin
if errorlevel 1 goto :fail

echo.
echo [6/8] Preparing local main branch...
git show-ref --verify --quiet refs/heads/main
if errorlevel 1 (
    git checkout -b main
    if errorlevel 1 goto :fail
) else (
    git checkout main
    if errorlevel 1 goto :fail
)

git reset origin/main
if errorlevel 1 goto :fail

echo.
echo [7/8] Creating commit...

echo Verifying Git ignore rules...
git check-ignore -q node_modules
if errorlevel 1 (
    echo [ERROR] node_modules is not ignored.
    echo Check .gitignore before deploying.
    goto :fail
)

echo Cleaning generated files from Git index...
git rm -r --cached --ignore-unmatch node_modules .next .vercel >nul 2>&1

git status
git add -A
if errorlevel 1 goto :fail

echo Checking staged files for GitHub 100 MB limit...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$limit=95MB; $bad=@(); git ls-files | ForEach-Object { if(Test-Path -LiteralPath $_){ $f=Get-Item -LiteralPath $_; if(-not $f.PSIsContainer -and $f.Length -ge $limit){ $bad += ('{0} ({1:N2} MB)' -f $_,($f.Length/1MB)) } } }; if($bad.Count -gt 0){ Write-Host '[ERROR] Large files detected in Git index:' -ForegroundColor Red; $bad | ForEach-Object { Write-Host ('  ' + $_) -ForegroundColor Red }; Write-Host 'Remove these files from Git or use an external storage solution.' -ForegroundColor Yellow; exit 1 }"
if errorlevel 1 goto :fail

git diff --cached --quiet
if not errorlevel 1 (
    echo.
    echo No new changes to commit.
) else (
    git commit -m "FC Edinet v%VERSION% deployment"
    if errorlevel 1 goto :fail
)

echo.
echo [8/8] Pushing to GitHub...
git push -u origin main
if errorlevel 1 goto :fail

echo.
echo ==========================================
echo SUCCESS
echo FC Edinet v%VERSION% pushed to GitHub.
echo Vercel should start deployment automatically.
echo ==========================================
echo.
echo After deployment check:
echo https://fc-edinet.vercel.app/api/version
echo.
pause
exit /b 0

:fail
echo.
echo ==========================================
echo DEPLOY FAILED
echo Check the error shown above.
echo Nothing after the failed step was executed.
echo ==========================================
echo.
pause
exit /b 1

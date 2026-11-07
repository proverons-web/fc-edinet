@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title FC Edinet - Production Health

echo ==========================================
echo FC EDINET - POST-DEPLOY HTTP CHECK
echo ==========================================
echo.
echo This checks 10 public pages on the LIVE website.
echo It does not measure Core Web Vitals or require admin login.
echo.
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  goto :fail
)
node scripts/check-production-v2313.mjs --base-url https://fc-edinet.vercel.app --expect-version 2.30.13 --report production-health-report.json
if errorlevel 1 goto :fail

echo.
echo [OK] Saved production-health-report.json
pause
exit /b 0

:fail
echo.
echo [ERROR] At least one check failed. Read the output above.
echo No files have been published or modified on the live site.
pause
exit /b 1

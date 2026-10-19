@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 請先安裝 Node.js 24 LTS：https://nodejs.org/
  pause
  exit /b 1
)
node preview.mjs
if errorlevel 1 pause

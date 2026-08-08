@echo off
REM Builds renderer and main from a clean clone.
REM Usage: scripts\build.bat
REM Optional: set CSC_NAME=Certificate name & scripts\build.bat  (code-signing for main's package step)
setlocal

set "ROOT_DIR=%~dp0.."

echo ==^> renderer: npm ci
cd /d "%ROOT_DIR%\renderer"
call npm ci
if errorlevel 1 exit /b %errorlevel%

echo ==^> renderer: npm run make-index-files
call npm run make-index-files
if errorlevel 1 exit /b %errorlevel%

echo ==^> renderer: npm run build
call npm run build
if errorlevel 1 exit /b %errorlevel%

echo ==^> main: npm ci
cd /d "%ROOT_DIR%\main"
call npm ci
if errorlevel 1 exit /b %errorlevel%

echo ==^> main: npm run build
call npm run build
if errorlevel 1 exit /b %errorlevel%

echo ==^> main: npm run package
echo     (set CSC_NAME=Certificate name to sign the build; without it, packaging still runs but is unsigned)
call npm run package
if errorlevel 1 exit /b %errorlevel%

echo ==^> Build complete.

endlocal

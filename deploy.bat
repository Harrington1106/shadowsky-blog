@echo off
cd /d "D:\Projects\shadowsky-blog"

echo.
echo ===== ShadowQuake Deploy =====
echo.
git status --short
echo.

set /p MSG="Message (Enter=auto): "
if "%MSG%"=="" set MSG=deploy

echo.
echo Pulling...
git stash
git pull --rebase
git stash pop
if %errorlevel% neq 0 (
    echo PULL FAILED - fix conflicts manually
    pause
    exit /b 1
)

echo.
echo Adding all changes...
git add -A ":!nul"

echo.
echo Committing: %MSG%
git commit -m "%MSG%"

echo.
echo Pushing...
git push

if %errorlevel% equ 0 (
    echo.
    echo DONE. Ctrl+Shift+R to refresh.
) else (
    echo.
    echo PUSH FAILED
)
pause

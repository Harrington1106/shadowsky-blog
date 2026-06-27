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
git stash pop 2>nul
if %errorlevel% neq 0 (
    echo.
    echo Conflicts detected - auto-fixing...
    git checkout --theirs . 2>nul
    git rm public/data/*.json public/posts/*.md 2>nul
    git add -A ":!nul" 2>nul
    git stash drop 2>nul
    echo Conflicts resolved.
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

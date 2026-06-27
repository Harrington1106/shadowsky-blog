@echo off
chcp 65001 >nul
cd /d "D:\Projects\shadowsky-blog"

echo.
echo ╔══════════════════════════════════════╗
echo ║      ShadowQuake 一键部署           ║
echo ╚══════════════════════════════════════╝
echo.

:: 显示变更列表
echo ── 文件变更 ──
git status --short
echo.

:: 确认
set /p MSG="提交信息（回车跳过=自动生成）: "
if "%MSG%"=="" set MSG=update: %date% %time%

:: 先拉取远程更新
echo.
echo ── 拉取远程更新 ──
git pull --rebase
if %errorlevel% neq 0 (
    echo ❌ 拉取失败，请手动解决冲突
    pause
    exit /b 1
)

:: 添加所有变更
echo.
echo ── 添加变更 ──
git add -A
git status --short

:: 确认推送
echo.
set /p OK="确认推送？(Y/n): "
if /i "%OK%"=="n" exit /b 0

:: 提交并推送
git commit -m "%MSG%"
git push

if %errorlevel% equ 0 (
    echo.
    echo ✅ 部署完成！
) else (
    echo.
    echo ❌ 推送失败
)

echo.
echo 提示：访问网站后 Ctrl+Shift+R 强制刷新
pause

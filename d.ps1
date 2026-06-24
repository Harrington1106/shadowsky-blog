# 博客部署脚本 - 用法: .\deploy.ps1 "改了什么"
param([string]$msg = "update")

git add -A
git commit -m $msg
git push

if ($LASTEXITCODE -ne 0) {
    Write-Host "Push 失败，尝试 stash 修复..."
    ssh shadowsky 'cd /www/wwwroot/47.118.28.27 && git stash'
    git push
    ssh shadowsky 'cd /www/wwwroot/47.118.28.27 && git stash pop'
}

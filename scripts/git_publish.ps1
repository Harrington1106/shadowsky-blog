# Git Publish & Auto Deploy Script
# 这个脚本帮助你快速提交代码到 GitHub，从而触发 GitHub Actions 自动部署

param (
    [string]$Message = "Update site content"
)

# 1. 更新文章索引
Write-Host "🔄 Updating post index..." -ForegroundColor Cyan
npm run update-posts

# 2. 检查 Git 状态
$gitStatus = git status --porcelain
if (-not $gitStatus) {
    Write-Host "✨ No changes to commit." -ForegroundColor Green
    exit
}

# 3. 提交更改
Write-Host "📦 Committing changes..." -ForegroundColor Cyan
git add .
git commit -m "$Message"

# 4. 推送到 GitHub
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Cyan
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Success! Code pushed to GitHub." -ForegroundColor Green
    Write-Host "GitHub Actions will now automatically deploy your site to Retinbox." -ForegroundColor Yellow
    Write-Host "You can check the progress here: https://github.com/Harrington1106/shadowsky-blog/actions" -ForegroundColor Gray
} else {
    Write-Host "`n❌ Push failed. Please check your git configuration." -ForegroundColor Red
}

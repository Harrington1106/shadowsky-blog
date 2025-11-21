# deploy-blog.ps1
# ===============================
# 自动生成文章索引并上传到 Retinbox（VS Code 环境最佳）
# ===============================

# 1️⃣ 设置项目根目录
$projectDir = "D:\shadowsky"  # 替换成你的实际路径
Set-Location $projectDir
Write-Host "当前目录: $(Get-Location)"

# 2️⃣ 生成文章索引
Write-Host "生成文章索引..."
node "$projectDir\js\generate-posts.js"

# 检查 posts.json 是否生成成功
$postsJsonPath = Join-Path $projectDir "posts\posts.json"
if (-Not (Test-Path $postsJsonPath)) {
    Write-Host "❌ 生成文章索引失败，请检查 generate-posts.js"
    exit 1
} else {
    Write-Host "✅ 已生成文章索引：$postsJsonPath"
}

# 3️⃣ 上传到 Retinbox
Write-Host "开始部署网站..."

# API Key 从环境变量读取，避免在脚本中硬编码
if (-not $env:RTH_API_KEY) {
    Write-Host "❌ 未检测到环境变量 RTH_API_KEY，请先设置后再部署"
    exit 1
}

# 绝对路径调用 CLI，确保和手动运行一致
$cliPath = "$projectDir\bundle.cjs"
$outDir = $projectDir
$cliCommand = "node `"$cliPath`" --site shadowsky --outdir `"$outDir`""

# 执行 CLI 上传
Write-Host "执行上传命令..."
Invoke-Expression $cliCommand

Write-Host "🎉 部署完成！请检查 Retinbox 网站是否更新成功"

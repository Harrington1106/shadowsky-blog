# hot-deploy.ps1
# ===============================
# Hot deployment script for Retinbox blog
# Watches Markdown files in posts/ folder and automatically
# regenerates posts.json and uploads to Retinbox
# ===============================

# Ensure UTF-8 output
$OutputEncoding = [System.Text.Encoding]::UTF8

# Project root directory
$projectDir = "D:\shadowsky"        # Change to your actual project path
$postsDir = Join-Path $projectDir "posts"
$cliPath = Join-Path $projectDir "bundle.cjs"
$outDir = $projectDir

# Ensure API key via environment variable
if (-not $env:RTH_API_KEY) {
    Write-Host "❌ 未检测到环境变量 RTH_API_KEY，无法进行部署"
    return
}

# Function to generate posts.json and deploy
function Invoke-PostsDeployment {
    Write-Host "--------------------------------"
    Write-Host "Change detected, generating posts index..."
    node "$projectDir\js\generate-posts.js"

    if (-Not (Test-Path "$postsDir\posts.json")) {
        Write-Host "❌ Failed to generate posts.json!"
        return
    }

    Write-Host "✅ posts.json generated, deploying site..."
    $cmd = "node `"$cliPath`" --site shadowsky --outdir `"$outDir`""
    Invoke-Expression $cmd
    Write-Host "🎉 Deployment completed!"
    Write-Host "--------------------------------"
}

# Run once initially
Deploy-Posts

# Watch Markdown files for changes
Write-Host "Watching $postsDir for Markdown file changes..."
$fsWatcher = New-Object System.IO.FileSystemWatcher
$fsWatcher.Path = $postsDir
$fsWatcher.Filter = "*.md"
$fsWatcher.IncludeSubdirectories = $false
$fsWatcher.EnableRaisingEvents = $true

# Event action
$action = {
    Start-Sleep -Milliseconds 500  # Wait for file write to complete
    Deploy-Posts
}

Register-ObjectEvent $fsWatcher "Changed" -Action $action
Register-ObjectEvent $fsWatcher "Created" -Action $action
Register-ObjectEvent $fsWatcher "Deleted" -Action $action

Write-Host "Hot deployment started. Press Ctrl+C to stop."
while ($true) { Start-Sleep 1 }

# ShadowSky Unified Deployment Script
# Orchestrates build and deployment to multiple targets (Retinbox + Alibaba Cloud)
# Ensures one failure does not block others.

$ErrorActionPreference = "Continue"

Write-Host "=== ShadowSky Unified Deployment ===" -ForegroundColor Cyan

# 1. Build
Write-Host "`n[1/3] Building Project..." -ForegroundColor Yellow
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Aborting." -ForegroundColor Red
    exit 1
}

# 2. Prepare Distribution (Explicitly run to ensure dist_rth exists even if deploy_rth fails or is skipped)
Write-Host "`n[2/3] Preparing Distribution..." -ForegroundColor Yellow
node scripts/prepare_deploy.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Preparation failed. Aborting." -ForegroundColor Red
    exit 1
}

# 3. Deploy to Retinbox
Write-Host "`n[3/3] Target 1: Retinbox (Static Host)..." -ForegroundColor Yellow
try {
    # Run deploy_rth.ps1 but don't let it kill this script
    powershell -ExecutionPolicy Bypass -File deploy_rth.ps1
    if ($LASTEXITCODE -eq 0) {
        $rthStatus = "✅ Success"
    } else {
        $rthStatus = "❌ Failed (Check logs above)"
        Write-Host "⚠️  Retinbox deployment failed, but proceeding to Alibaba Cloud..." -ForegroundColor DarkYellow
    }
} catch {
    $rthStatus = "❌ Error: $_"
    Write-Host "⚠️  Retinbox deployment error: $_" -ForegroundColor DarkYellow
}

# 4. Deploy to Alibaba Cloud
Write-Host "`n[3/3] Target 2: Alibaba Cloud..." -ForegroundColor Yellow
try {
    powershell -ExecutionPolicy Bypass -File sync_aliyun.ps1
    if ($LASTEXITCODE -eq 0) {
        $aliyunStatus = "✅ Success"
    } else {
        $aliyunStatus = "❌ Failed"
    }
} catch {
    $aliyunStatus = "❌ Error: $_"
}

# Summary
Write-Host "`n=== Deployment Summary ===" -ForegroundColor Cyan

if ($rthStatus -match "Success") { $rthColor = "Green" } else { $rthColor = "Red" }
Write-Host "Retinbox:      $rthStatus" -ForegroundColor $rthColor

if ($aliyunStatus -match "Success") { $aliyunColor = "Green" } else { $aliyunColor = "Red" }
Write-Host "Alibaba Cloud: $aliyunStatus" -ForegroundColor $aliyunColor

if ($rthStatus -match "Success" -and $aliyunStatus -match "Success") {
    exit 0
} elseif ($aliyunStatus -match "Success") {
    Write-Host "`n⚠️  Partial success (Alibaba Cloud OK, Retinbox Failed)." -ForegroundColor Yellow
    exit 0 # Exit 0 because user prioritized Alibaba Cloud restoration
} else {
    exit 1
}

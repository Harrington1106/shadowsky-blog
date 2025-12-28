# Unified Deployment Script for ShadowQuake
# Combines Build, RTH Deployment, and Aliyun Sync

param(
    [switch]$SkipBuild,
    [switch]$SkipRTH,
    [switch]$SkipAliyun
)

$ErrorActionPreference = "Stop"
$ScriptRoot = $PSScriptRoot
$ProjectRoot = "$PSScriptRoot\.."
$EnvFile = "$ProjectRoot\.env"

# --- 1. Load Environment Variables ---
Write-Host "=== ShadowQuake Unified Deploy ===" -ForegroundColor Cyan
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $val = $matches[2].Trim()
            if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
            [Environment]::SetEnvironmentVariable($name, $val, "Process")
            # Set script-scope variables for Aliyun
            if ($name -match '^ALIYUN_(HOST|USER|PATH|PORT)$') {
                Set-Variable -Name $name -Value $val -Scope Script
            }
        }
    }
    Write-Host "Loaded configuration from .env" -ForegroundColor Gray
} else {
    Write-Host "Warning: .env file not found at $EnvFile" -ForegroundColor Yellow
}

# --- 2. Build ---
if (-not $SkipBuild) {
    Write-Host "`n[1/3] Building Project..." -ForegroundColor Yellow
    Set-Location $ProjectRoot
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Build failed" }
        Write-Host "Build successful." -ForegroundColor Green
    } catch {
        Write-Host "❌ Build failed. Fix errors and try again." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n[1/3] Build skipped." -ForegroundColor Gray
}

# --- 3. RTH Deployment ---
if (-not $SkipRTH) {
    Write-Host "`n[2/3] Deploying to RTH (Retinbox)..." -ForegroundColor Yellow
    
    # Network Fixes
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
    $env:NODE_OPTIONS = "--dns-result-order=ipv4first"
    
    $siteName = if ($env:SITE_NAME) { $env:SITE_NAME } else { "shadowquake.top" }
    $cliUrl = "https://host.retiehe.com/cli"
    $tempFile = "$env:TEMP\rth_cli.js"
    $wrapperFile = "$ScriptRoot\rth_wrapper.mjs"
    
    if (-not (Test-Path $wrapperFile)) {
        Write-Host "❌ Wrapper file not found at $wrapperFile" -ForegroundColor Red
        exit 1
    }

    # Download CLI (Simplified)
    if (-not (Test-Path $tempFile) -or ((Get-Date) - (Get-Item $tempFile).LastWriteTime).TotalHours -gt 1) {
        Write-Host "  Downloading CLI..." -ForegroundColor Gray
        try {
            $wc = New-Object System.Net.WebClient
            $wc.Headers.Add("User-Agent", "Mozilla/5.0")
            $wc.DownloadFile($cliUrl, $tempFile)
        } catch {
            Write-Host "❌ Failed to download CLI: $_" -ForegroundColor Red
            exit 1
        }
    }

    # Prepare Build for RTH
    Set-Location $ProjectRoot
    node scripts/prepare_deploy.js
    
    # Deploy Wrapper
    $cliLocal = "$ScriptRoot\rth_cli_temp.cjs"
    Copy-Item $tempFile $cliLocal -Force
    
    Write-Host "  Uploading to $siteName..." -ForegroundColor Gray
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = "cmd"
    $pinfo.Arguments = "/c node --no-experimental-fetch `"$wrapperFile`" --site $siteName --outdir dist_rth 2>&1"
    $pinfo.RedirectStandardOutput = $true
    $pinfo.UseShellExecute = $false
    $pinfo.CreateNoWindow = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $pinfo
    $process.Start() | Out-Null
    $output = $process.StandardOutput.ReadToEnd()
    $process.WaitForExit()
    
    Remove-Item $cliLocal -ErrorAction SilentlyContinue
    
    if ($process.ExitCode -eq 0 -or $output -match "Done\.") {
        Write-Host "✅ RTH Deployment Successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ RTH Deployment Failed:" -ForegroundColor Red
        Write-Host $output -ForegroundColor Gray
        exit 1
    }
} else {
    Write-Host "`n[2/3] RTH Deployment skipped." -ForegroundColor Gray
}

# --- 4. Aliyun Sync ---
if (-not $SkipAliyun) {
    Write-Host "`n[3/3] Syncing to Alibaba Cloud..." -ForegroundColor Yellow
    
    if (-not $ALIYUN_HOST -or -not $ALIYUN_USER) {
        Write-Host "❌ Aliyun credentials missing in .env (ALIYUN_HOST, ALIYUN_USER, ALIYUN_PATH)" -ForegroundColor Red
        exit 1
    }
    
    $ALIYUN_PORT = if ($ALIYUN_PORT) { $ALIYUN_PORT } else { "22" }
    $stageDir = "$env:TEMP\shadowquake_stage"
    $tarFile = "$env:TEMP\shadowquake_deploy.tar.gz"
    
    # Stage
    if (Test-Path $stageDir) { Remove-Item $stageDir -Recurse -Force }
    New-Item -ItemType Directory -Path $stageDir | Out-Null
    
    # Copy Static
    $distDir = "$ProjectRoot\dist_rth"
    if (Test-Path $distDir) { Copy-Item "$distDir\*" $stageDir -Recurse -Force }
    else { Write-Host "❌ dist_rth missing!" -ForegroundColor Red; exit 1 }
    
    # Copy Backend
    Copy-Item "$ProjectRoot\api" $stageDir -Recurse -Force
    Copy-Item "$ProjectRoot\admin" $stageDir -Recurse -Force
    
    # Compress
    try {
        tar -czf $tarFile -C $stageDir .
    } catch {
        Write-Host "❌ Compression failed (tar not found?)" -ForegroundColor Red
        exit 1
    }
    
    # Upload & Extract
    $remoteTmp = "/tmp/sq_deploy_$(Get-Date -Format 'yyyyMMddHHmmss').tar.gz"
    $scpArgs = @("-P", $ALIYUN_PORT, $tarFile, "${ALIYUN_USER}@${ALIYUN_HOST}:${remoteTmp}")
    
    Write-Host "  Uploading..." -ForegroundColor Gray
    scp @scpArgs
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Extracting..." -ForegroundColor Gray
        $remoteCmd = "mkdir -p ${ALIYUN_PATH} && tar -xzf ${remoteTmp} -C ${ALIYUN_PATH} && rm ${remoteTmp} && chmod -R 755 ${ALIYUN_PATH}/api ${ALIYUN_PATH}/admin"
        ssh -p $ALIYUN_PORT "${ALIYUN_USER}@${ALIYUN_HOST}" $remoteCmd
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Aliyun Sync Successful!" -ForegroundColor Green
        } else {
            Write-Host "❌ Remote extraction failed." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Upload failed." -ForegroundColor Red
        exit 1
    }
    
    # Cleanup
    Remove-Item $stageDir -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $tarFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "`n[3/3] Aliyun Sync skipped." -ForegroundColor Gray
}

Write-Host "`n=== All Tasks Completed! ===" -ForegroundColor Cyan

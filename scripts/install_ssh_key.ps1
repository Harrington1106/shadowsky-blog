# Install SSH Key to Remote Server Script
# Helps you set up password-less login

$envFile = "$PSScriptRoot\.env"

# 1. Load Configuration
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }
            Set-Variable -Name $name -Value $value -Scope Script
        }
    }
}

# Default port to 22 if not set
if (-not $ALIYUN_PORT) { $ALIYUN_PORT = "22" }

if (-not $ALIYUN_HOST -or -not $ALIYUN_USER) {
    Write-Host "Missing config in .env" -ForegroundColor Red
    exit 1
}

$sshDir = "$env:USERPROFILE\.ssh"
$pubKeyPath = "$sshDir\id_ed25519.pub"

if (-not (Test-Path $pubKeyPath)) {
    Write-Host "No SSH key found. Generating one..." -ForegroundColor Yellow
    ssh-keygen -t ed25519 -f "$sshDir\id_ed25519" -N ""
}

$pubKeyContent = Get-Content $pubKeyPath
Write-Host "Public Key found: $pubKeyPath" -ForegroundColor Cyan

Write-Host "--------------------------------------------------------"
Write-Host "Ready to install SSH key to $ALIYUN_HOST (Port $ALIYUN_PORT)" -ForegroundColor Yellow
Write-Host "You will be asked for your password ONE LAST TIME." -ForegroundColor Yellow
Write-Host "If you see 'Permission denied', your password is WRONG." -ForegroundColor Red
Write-Host "--------------------------------------------------------"

# Ensure .ssh directory exists and authorized_keys has correct permissions
$remoteCmd = "mkdir -p ~/.ssh && echo '$pubKeyContent' >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"

ssh -p $ALIYUN_PORT "${ALIYUN_USER}@${ALIYUN_HOST}" $remoteCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS! SSH key installed." -ForegroundColor Green
    Write-Host "You can now run '.\sync_aliyun.ps1' without a password." -ForegroundColor Green
} else {
    Write-Host "FAILED. Please check your password and try again." -ForegroundColor Red
    Write-Host "If you forgot your password, reset it in Alibaba Cloud Console." -ForegroundColor Gray
}

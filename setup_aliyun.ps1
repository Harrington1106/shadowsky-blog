# Setup Alibaba Cloud Configuration
# Configures .env with Alibaba Cloud server details

$envFile = "$PSScriptRoot\.env"

Write-Host "Configuring Alibaba Cloud Connection..." -ForegroundColor Cyan

$hostIp = Read-Host "Enter Alibaba Cloud Server IP (e.g., 47.xx.xx.xx)"
$user = Read-Host "Enter SSH Username (default: root)"
if (-not $user) { $user = "root" }
$path = Read-Host "Enter Remote Path (e.g., /var/www/html/api)"
if (-not $path) { $path = "/var/www/html" }

if (-not $hostIp) {
    Write-Error "Server IP is required."
    exit 1
}

# Read existing .env or create new
$envContent = @()
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
}

# Function to update or add key
function Update-EnvKey {
    param($key, $val)
    $found = $false
    for ($i = 0; $i -lt $envContent.Count; $i++) {
        if ($envContent[$i] -match "^$key=") {
            $envContent[$i] = "$key=$val"
            $found = $true
            break
        }
    }
    if (-not $found) {
        $envContent += "$key=$val"
    }
}

Update-EnvKey "ALIYUN_HOST" $hostIp
Update-EnvKey "ALIYUN_USER" $user
Update-EnvKey "ALIYUN_PATH" $path

$envContent | Set-Content $envFile

Write-Host "`nConfiguration saved to .env" -ForegroundColor Green
Write-Host "You can now run '.\sync_aliyun.ps1' to upload files." -ForegroundColor Yellow

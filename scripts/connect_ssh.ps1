$EnvFile = "$PSScriptRoot\..\.env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $val = $matches[2].Trim()
            Set-Variable -Name $name -Value $val -Scope Script
        }
    }
} else {
    Write-Error ".env file not found at $EnvFile"
    exit 1
}

$ALIYUN_PORT = if ($ALIYUN_PORT) { $ALIYUN_PORT } else { "22" }
Write-Host "Connecting to ${ALIYUN_USER}@${ALIYUN_HOST}:${ALIYUN_PORT}..." -ForegroundColor Green

ssh -p $ALIYUN_PORT "${ALIYUN_USER}@${ALIYUN_HOST}"

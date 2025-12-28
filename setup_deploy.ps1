# Setup Deployment Script
# This script helps you configure automatic deployment to Retinbox

$envFile = "$PSScriptRoot\.env"

Write-Host "Configuring deployment for ShadowSky Blog..." -ForegroundColor Cyan

# Check if .env exists
if (Test-Path $envFile) {
    Write-Host "Found existing .env file." -ForegroundColor Yellow
    $currentContent = Get-Content $envFile -Raw
    if ($currentContent -match "RTH_API_KEY") {
        Write-Host "RTH_API_KEY is already configured." -ForegroundColor Green
        $response = Read-Host "Do you want to update it? (y/n)"
        if ($response -ne 'y') {
            Write-Host "Skipping configuration."
        } else {
            $apiKey = Read-Host "Enter your Retinbox API Key"
            # Replace or append
            if ($apiKey) {
                $content = Get-Content $envFile
                $newContent = $content | Where-Object { $_ -notmatch "^RTH_API_KEY=" }
                $newContent += "RTH_API_KEY=$apiKey"
                Set-Content $envFile $newContent
                Write-Host "Updated .env with new API Key." -ForegroundColor Green
            }
        }
    } else {
        $apiKey = Read-Host "Enter your Retinbox API Key"
        if ($apiKey) {
            Add-Content $envFile "`nRTH_API_KEY=$apiKey"
            Write-Host "Added API Key to .env." -ForegroundColor Green
        }
    }
} else {
    Write-Host "Creating new .env file..." -ForegroundColor Yellow
    $apiKey = Read-Host "Enter your Retinbox API Key"
    if ($apiKey) {
        Set-Content $envFile "RTH_API_KEY=$apiKey"
        Write-Host "Created .env with API Key." -ForegroundColor Green
    } else {
        Write-Error "No API Key provided. Deployment setup cannot continue."
        exit 1
    }
}

Write-Host "`nConfiguration complete!" -ForegroundColor Cyan
Write-Host "You can now deploy using the following command:"
Write-Host "  npm run deploy" -ForegroundColor Yellow
Write-Host "  OR"
Write-Host "  .\deploy_rth.ps1" -ForegroundColor Yellow

$test = Read-Host "Do you want to test deployment now? (y/n)"
if ($test -eq 'y') {
    Write-Host "Running deployment..."
    npm run deploy
}

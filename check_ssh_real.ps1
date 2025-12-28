param(
    [string]$HostName = "47.118.28.27",
    [int[]]$Ports = @(22, 22000, 2222, 2022, 10022, 8888, 888)
)

Write-Host "Testing SSH ports..." -ForegroundColor Cyan

foreach ($Port in $Ports) {
    Write-Host -NoNewline "Checking port $Port : "
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcp.BeginConnect($HostName, $Port, $null, $null)
        $wait = $asyncResult.AsyncWaitHandle.WaitOne(2000, $false)
        
        if ($tcp.Connected) {
            $stream = $tcp.GetStream()
            $buffer = New-Object byte[] 256
            
            Start-Sleep -Milliseconds 500
            
            if ($stream.DataAvailable) {
                $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
                $response = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $bytesRead).Trim()
                
                if ($response -match "^SSH-") {
                    Write-Host "FOUND SSH! (Version: $response)" -ForegroundColor Green
                    Write-Host "REAL SSH PORT IS: $Port" -ForegroundColor Yellow
                    $tcp.Close()
                    break
                } else {
                    Write-Host "Open, but NOT SSH (Response: $response)" -ForegroundColor Gray
                }
            } else {
                Write-Host "Open, but no response (likely NOT SSH)" -ForegroundColor Gray
            }
            $tcp.Close()
        } else {
            Write-Host "Closed" -ForegroundColor Red
        }
    } catch {
        Write-Host "Error connecting" -ForegroundColor Red
    }
}

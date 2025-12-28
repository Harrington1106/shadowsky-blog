param(
    [string]$HostName = "47.118.28.27",
    [int[]]$Ports = @(22, 22000, 2222, 8888)
)

Write-Host "正在测试服务器 $HostName 的端口连通性..." -ForegroundColor Cyan

foreach ($Port in $Ports) {
    Write-Host -NoNewline "尝试端口 $Port ... "
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $connection.BeginConnect($HostName, $Port, $null, $null)
        $wait = $asyncResult.AsyncWaitHandle.WaitOne(2000, $false) # 2秒超时
        
        if ($connection.Connected) {
            Write-Host "✅ 通的！ (SSH可能在这个端口)" -ForegroundColor Green
            $connection.Close()
        } else {
            Write-Host "❌ 无法连接 (超时)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ 失败: $_" -ForegroundColor Red
    }
}

Write-Host "`n如果上面显示某个端口是通的，请把那个端口填入 .env 文件。" -ForegroundColor Yellow
Write-Host "如果全是红叉，说明防火墙把 SSH 拦截了。" -ForegroundColor Gray

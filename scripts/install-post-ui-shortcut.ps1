<#
    在桌面和开始菜单放一个「发布台」快捷方式。

    快捷方式指向 wscript.exe + publish-launcher.vbs，图标用 post-ui.ico
    （由 make-ico.mjs 从站点 favicon 生成）。

    仓库换位置后重跑一次即可 —— 快捷方式里存的是绝对路径。

    用法:  powershell -ExecutionPolicy Bypass -File scripts\install-post-ui-shortcut.ps1
    卸载:  powershell -ExecutionPolicy Bypass -File scripts\install-post-ui-shortcut.ps1 -Uninstall
#>
param([switch]$Uninstall)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$vbs      = Join-Path $PSScriptRoot 'publish-launcher.vbs'
$ico      = Join-Path $PSScriptRoot 'post-ui.ico'
$name     = '发布台.lnk'

$targets = @(
    (Join-Path ([Environment]::GetFolderPath('Desktop')) $name),
    (Join-Path ([Environment]::GetFolderPath('StartMenu')) "Programs\$name")
)

if ($Uninstall) {
    foreach ($t in $targets) {
        if (Test-Path $t) { Remove-Item $t -Force; "已删除  $t" } else { "不存在  $t" }
    }
    return
}

foreach ($p in @($vbs, $ico)) {
    if (-not (Test-Path $p)) { throw "缺文件: $p（.ico 用 node scripts/make-ico.mjs 生成）" }
}

$shell = New-Object -ComObject WScript.Shell
foreach ($t in $targets) {
    $dir = Split-Path -Parent $t
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $lnk = $shell.CreateShortcut($t)
    # 用 wscript 而不是 cscript：cscript 会开控制台窗口
    $lnk.TargetPath       = Join-Path $env:SystemRoot 'System32\wscript.exe'
    $lnk.Arguments        = '"{0}"' -f $vbs
    $lnk.WorkingDirectory = $repoRoot
    $lnk.IconLocation     = "$ico,0"
    $lnk.Description      = 'ShadowQuake 发布台 —— 预览草稿并发到线上'
    $lnk.WindowStyle      = 7          # 最小化：wscript 本身不该占前台
    $lnk.Save()
    "已创建  $t"
}

"`n双击桌面上的「发布台」即可。仓库移动过就重跑本脚本。"

#!/bin/bash
# GNZ48 Calendar 文件上传脚本
# 上传新版本GNZ48日历文件到服务器根目录

echo "开始上传GNZ48日历新版本文件..."
echo ""

# 定义本地和远程路径
LOCAL_SOURCE="D:\Projects\GNZ48-Calendar\public"
REMOTE_TARGET="/www/wwwroot/47.118.28.27"

# 检查本地文件是否存在
echo "检查本地文件..."
if [ ! -d "$LOCAL_SOURCE" ]; then
    echo "错误: 本地目录 $LOCAL_SOURCE 不存在"
    echo "请确认 GNZ48-Calendar/public 目录存在且包含以下文件:"
    echo "  - gnz48.html"
    echo "  - app.js"
    echo "  - data.js"
    echo "  - schedule.json"
    echo "  - team-g.ics"
    exit 1
fi

echo "本地文件清单:"
ls -la "$LOCAL_SOURCE/"

echo ""
echo "准备上传以下5个文件到服务器根目录:"
for file in gnz48.html app.js data.js schedule.json team-g.ics; do
    if [ -f "$LOCAL_SOURCE/$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (缺失)"
        exit 1
    fi
done

echo ""
echo "上传文件到服务器..."
echo "目标路径: $REMOTE_TARGET/"
echo ""

# 上传每个文件
for file in gnz48.html app.js data.js schedule.json team-g.ics; do
    echo "上传 $file..."
    scp "$LOCAL_SOURCE/$file" shadowsky:"$REMOTE_TARGET/$file"
    if [ $? -eq 0 ]; then
        echo "  ✓ $file 上传成功"
    else
        echo "  ✗ $file 上传失败"
        exit 1
    fi
done

echo ""
echo "文件上传完成！"
echo ""
echo "=== 部署结果 ==="
echo "新文件已部署到:"
echo "  - https://shadowquake.top/gnz48.html"
echo "  - https://shadowquake.top/app.js"
echo "  - https://shadowquake.top/data.js"
echo "  - https://shadowquake.top/schedule.json"
echo "  - https://shadowquake.top/team-g.ics"
echo ""
echo "下一步:"
echo "1. 运行 nginx 重载配置: ssh shadowsky 'nginx -s reload'"
echo "2. 访问 https://shadowquake.top/gnz48.html 验证新页面"
echo "3. 测试日历订阅: https://shadowquake.top/team-g.ics"
echo "4. 清理旧文件（如果需要）"
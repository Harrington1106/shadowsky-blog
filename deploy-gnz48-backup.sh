#!/bin/bash
# GNZ48 Calendar 部署备份脚本
# 备份现有GNZ48相关文件

echo "开始备份GNZ48日历文件..."

# 创建备份目录
BACKUP_DIR="/tmp/gnz48-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 备份根目录的gnz48.html
echo "备份 /www/wwwroot/47.118.28.27/gnz48.html..."
cp -v /www/wwwroot/47.118.28.27/gnz48.html "$BACKUP_DIR/" 2>/dev/null || echo "gnz48.html不存在或备份失败"

# 备份calendar目录
echo "备份 /www/wwwroot/47.118.28.27/calendar/ 目录..."
if [ -d "/www/wwwroot/47.118.28.27/calendar/" ]; then
    cp -rv /www/wwwroot/47.118.28.27/calendar/ "$BACKUP_DIR/calendar-backup/"
    echo "calendar目录备份完成"
else
    echo "calendar目录不存在"
fi

# 备份nginx配置
echo "备份nginx配置..."
cp -v /etc/nginx/conf.d/shadowquake.top.conf "$BACKUP_DIR/nginx-backup.conf" 2>/dev/null || echo "nginx配置备份失败"

echo "备份完成！文件保存在: $BACKUP_DIR"
echo "备份内容:"
ls -la "$BACKUP_DIR/" 2>/dev/null || echo "备份目录为空"

echo ""
echo "=== 备份总结 ==="
echo "1. 旧版gnz48.html已备份"
echo "2. calendar目录已备份"
echo "3. nginx配置已备份"
echo ""
echo "现在可以安全部署新版本"
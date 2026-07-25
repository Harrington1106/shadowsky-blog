#!/bin/bash
# GNZ48 Calendar nginx配置更新脚本
# 更新nginx配置以支持根目录的GNZ48文件

echo "更新nginx配置以支持根目录GNZ48文件..."
echo ""

# 备份当前nginx配置
echo "备份当前nginx配置..."
ssh shadowsky 'sudo cp /etc/nginx/conf.d/shadowquake.top.conf /etc/nginx/conf.d/shadowquake.top.conf.backup.$(date +%Y%m%d-%H%M%S)'

echo "上传新的nginx配置..."
# 上传修改后的配置
scp D:/Projects/shadowsky-blog/nginx/shadowquake.top.conf shadowsky:/tmp/shadowquake.top.conf.new

if [ $? -ne 0 ]; then
    echo "错误: nginx配置文件上传失败"
    exit 1
fi

echo "验证nginx配置语法..."
ssh shadowsky 'sudo nginx -t -c /tmp/shadowquake.top.conf.new'

if [ $? -eq 0 ]; then
    echo "✓ 新配置语法正确"

    echo "应用新配置..."
    ssh shadowsky 'sudo cp /tmp/shadowquake.top.conf.new /etc/nginx/conf.d/shadowquake.top.conf'

    echo "重载nginx配置..."
    ssh shadowsky 'sudo nginx -s reload'

    if [ $? -eq 0 ]; then
        echo "✓ nginx配置更新成功并已重载"

        echo ""
        echo "=== 配置变更摘要 ==="
        echo "变更前: GNZ48文件通过 /calendar/ 路径访问"
        echo "变更后: GNZ48文件通过根目录直接访问"
        echo ""
        echo "新访问路径:"
        echo "  - https://shadowquake.top/gnz48.html"
        echo "  - https://shadowquake.top/team-g.ics"
        echo "  - https://shadowquake.top/schedule.json"
        echo ""
        echo "配置中的GNZ48部分已更新:"
        echo "  - 移除 /calendar/ location块"
        echo "  - 添加针对根目录 team-g.ics 和 schedule.json 的location规则"
        echo "  - 保持CORS头和缓存设置"
        echo ""
        echo "如需恢复旧配置，可以从备份恢复:"
        echo "  ssh shadowsky 'sudo cp /etc/nginx/conf.d/shadowquake.top.conf.backup.* /etc/nginx/conf.d/shadowquake.top.conf && sudo nginx -s reload'"
    else
        echo "✗ nginx重载失败"
        exit 1
    fi
else
    echo "✗ 新配置语法错误，请检查配置"
    exit 1
fi
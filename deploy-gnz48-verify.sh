#!/bin/bash
# GNZ48 Calendar 部署验证脚本
# 验证部署是否成功

echo "验证GNZ48日历部署..."
echo ""

# 检查文件是否存在
echo "=== 检查服务器文件 ==="
for file in gnz48.html app.js data.js schedule.json team-g.ics; do
    echo -n "检查 $file ... "
    ssh shadowsky "ls -la /www/wwwroot/47.118.28.27/$file 2>/dev/null" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ 存在"
    else
        echo "✗ 缺失"
    fi
done

echo ""
echo "=== 测试HTTP访问 ==="
echo "测试网页访问..."
curl -s -o /dev/null -w "gnz48.html: HTTP %{http_code}\n" https://shadowquake.top/gnz48.html

echo "测试ICS文件访问..."
curl -s -o /dev/null -w "team-g.ics: HTTP %{http_code}\n" https://shadowquake.top/team-g.ics

echo "测试JSON数据访问..."
curl -s -o /dev/null -w "schedule.json: HTTP %{http_code}\n" https://shadowquake.top/schedule.json

echo ""
echo "=== 测试CORS头 ==="
echo "测试team-g.ics的CORS头..."
curl -s -I https://shadowquake.top/team-g.ics | grep -i "access-control"

echo ""
echo "=== 检查MIME类型 ==="
echo "检查team-g.ics的Content-Type..."
curl -s -I https://shadowquake.top/team-g.ics | grep -i "content-type"

echo "检查schedule.json的Content-Type..."
curl -s -I https://shadowquake.top/schedule.json | grep -i "content-type"

echo ""
echo "=== 验证新功能 ==="
echo "验证ICS文件内容..."
curl -s https://shadowquake.top/team-g.ics | head -5

echo ""
echo "验证schedule.json内容..."
curl -s https://shadowquake.top/schedule.json | head -5

echo ""
echo "=== 部署验证总结 ==="
echo "1. 文件存在性检查"
echo "2. HTTP访问测试"
echo "3. CORS头验证"
echo "4. MIME类型验证"
echo "5. 文件内容采样"
echo ""
echo "如果上述检查全部通过，部署成功！"
echo "请访问 https://shadowquake.top/gnz48.html 查看新界面"
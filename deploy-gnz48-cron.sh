#!/bin/bash
# GNZ48 Calendar 定时任务设置脚本
# 设置自动抓取更新数据的定时任务

echo "设置GNZ48日历定时更新任务..."
echo ""

# 检查是否在服务器上运行
if [ "$(hostname)" != "shadowsky" ]; then
    echo "警告: 此脚本需要在服务器上运行"
    echo "将在服务器上设置定时任务"
    echo ""
fi

echo "=== 定时任务方案 ==="
echo "方案A: 每天凌晨3点更新（推荐，避开访问高峰）"
echo "方案B: 每6小时更新一次（更频繁）"
echo "方案C: 自定义时间"
echo ""

read -p "选择方案 (A/B/C): " schedule_choice

case $schedule_choice in
    A|a)
        CRON_SCHEDULE="0 3 * * *"
        echo "选择方案A: 每天凌晨3点更新"
        ;;
    B|b)
        CRON_SCHEDULE="0 */6 * * *"
        echo "选择方案B: 每6小时更新一次"
        ;;
    C|c)
        read -p "输入cron表达式 (如 '0 3 * * *'): " custom_cron
        CRON_SCHEDULE="$custom_cron"
        echo "自定义: $CRON_SCHEDULE"
        ;;
    *)
        echo "使用默认: 每天凌晨3点更新"
        CRON_SCHEDULE="0 3 * * *"
        ;;
esac

echo ""
echo "=== 创建定时任务脚本 ==="

# 创建服务器端更新脚本
UPDATE_SCRIPT=$(cat << 'EOF'
#!/bin/bash
# GNZ48日历自动更新脚本

LOG_DIR="/var/log/gnz48-calendar"
LOG_FILE="$LOG_DIR/update-$(date +%Y%m%d).log"
PROJECT_DIR="/opt/gnz48-calendar"

echo "=== GNZ48日历更新 $(date) ===" >> "$LOG_FILE"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 检查项目目录是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    echo "错误: 项目目录 $PROJECT_DIR 不存在" | tee -a "$LOG_FILE"
    exit 1
fi

# 进入项目目录
cd "$PROJECT_DIR" || exit 1

echo "开始更新..." | tee -a "$LOG_FILE"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "安装依赖..." | tee -a "$LOG_FILE"
    npm install >> "$LOG_FILE" 2>&1
fi

# 运行抓取脚本
echo "运行npm run fetch..." | tee -a "$LOG_FILE"
npm run fetch >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "抓取成功，复制文件到网站根目录..." | tee -a "$LOG_FILE"

    # 复制新文件到网站根目录
    cp -v public/* /www/wwwroot/47.118.28.27/ >> "$LOG_FILE" 2>&1

    echo "更新完成！" | tee -a "$LOG_FILE"
    echo "更新时间: $(date)" | tee -a "$LOG_FILE"

    # 记录文件大小
    echo "生成的文件大小:" | tee -a "$LOG_FILE"
    ls -lh public/* | tee -a "$LOG_FILE"
else
    echo "抓取失败，请检查错误日志" | tee -a "$LOG_FILE"
    exit 1
fi

echo "=== 更新结束 $(date) ===" >> "$LOG_FILE"
EOF
)

echo "将在服务器上创建以下更新脚本:"
echo "----------------------------------------"
echo "$UPDATE_SCRIPT"
echo "----------------------------------------"

echo ""
echo "=== 部署步骤 ==="
echo "1. 上传项目到服务器 /opt/gnz48-calendar/"
echo "2. 创建更新脚本 /usr/local/bin/gnz48-update.sh"
echo "3. 设置crontab定时任务"
echo "4. 测试第一次更新"
echo ""
echo "继续吗？(y/n)"
read -p "> " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "取消设置"
    exit 0
fi

echo "开始设置定时任务..."

# 在服务器上执行设置
ssh shadowsky << EOF
echo "1. 创建项目目录..."
sudo mkdir -p /opt/gnz48-calendar

echo "2. 创建更新脚本..."
cat > /tmp/gnz48-update.sh << 'SCRIPTEOF'
$UPDATE_SCRIPT
SCRIPTEOF

sudo mv /tmp/gnz48-update.sh /usr/local/bin/gnz48-update.sh
sudo chmod +x /usr/local/bin/gnz48-update.sh

echo "3. 设置crontab..."
(crontab -l 2>/dev/null | grep -v "gnz48-update.sh"; echo "$CRON_SCHEDULE /usr/local/bin/gnz48-update.sh") | crontab -

echo "4. 检查crontab..."
crontab -l | grep gnz48-update

echo ""
echo "=== 定时任务设置完成 ==="
echo "更新时间: $CRON_SCHEDULE"
echo "更新脚本: /usr/local/bin/gnz48-update.sh"
echo "日志目录: /var/log/gnz48-calendar/"
echo ""
echo "手动测试: sudo /usr/local/bin/gnz48-update.sh"
echo "查看日志: tail -f /var/log/gnz48-calendar/update-\$(date +%Y%m%d).log"
EOF

echo "定时任务设置完成！"
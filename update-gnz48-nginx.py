#!/usr/bin/env python3
"""
修改nginx配置文件中的GNZ48配置部分
将 /calendar/ 路径改为根目录处理
"""

import sys
import os

def update_nginx_config(config_path):
    """更新nginx配置文件"""
    print(f"读取配置文件: {config_path}")

    with open(config_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 找到GNZ48配置的开始和结束位置
    start_line = -1
    for i, line in enumerate(lines):
        if '# ===== GNZ48 Calendar .ics subscription =====' in line:
            start_line = i
            break

    if start_line == -1:
        print("错误: 未找到GNZ48配置部分")
        return False

    print(f"找到GNZ48配置在第 {start_line+1} 行")

    # 找到location块的结束位置（下一个不以空格或}开头的行）
    end_line = start_line
    for i in range(start_line + 1, len(lines)):
        # 如果遇到}单独一行且缩进相同，说明是location块的结束
        if lines[i].strip() == '}':
            end_line = i
            break
        # 或者遇到下一个非空行且不是以4个空格开头的（新配置块的开始）
        elif lines[i].strip() != '' and not lines[i].startswith('    '):
            end_line = i - 1
            break

    print(f"GNZ48配置块从第 {start_line+1} 行到第 {end_line+1} 行")

    # 新的GNZ48配置
    new_config = '''    # ===== GNZ48 Calendar .ics subscription =====
    # 处理根目录的 calendar 文件
    location ~ ^/(team-g\\.ics|schedule\\.json)$ {
        default_type text/calendar;
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS' always;

        # schedule.json 需要 application/json 类型
        location ~ \\.json$ {
            default_type application/json;
        }

        try_files $uri =404;
    }
'''

    # 替换配置
    lines[start_line:end_line+1] = new_config.splitlines(keepends=True)

    # 写入备份文件
    backup_path = config_path + '.backup'
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(''.join(lines))

    print(f"配置已更新到: {backup_path}")
    print("新配置内容:")
    print(new_config)

    return True

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(f"用法: {sys.argv[0]} <nginx配置文件路径>")
        print("例如: python3 update-gnz48-nginx.py /www/server/panel/vhost/nginx/shadowquake.top.conf")
        sys.exit(1)

    config_file = sys.argv[1]

    if not os.path.exists(config_file):
        print(f"错误: 配置文件不存在: {config_file}")
        sys.exit(1)

    if update_nginx_config(config_file):
        print("配置更新完成！")
        print("请使用 'nginx -t' 测试配置语法，然后重载nginx 'nginx -s reload'")
    else:
        print("配置更新失败")
        sys.exit(1)
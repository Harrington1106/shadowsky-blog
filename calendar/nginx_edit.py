#!/usr/bin/env python3
"""为 nginx vhost 配置添加 /calendar/ location block"""

import shutil

path = '/www/server/panel/vhost/nginx/shadowquake.top.conf'

# 备份原配置
shutil.copy(path, path + '.bak')

with open(path, 'r') as f:
    content = f.read()

calendar_block = """    # ===== GNZ48 Calendar .ics subscription =====
    location /calendar/ {
        default_type text/calendar;
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS' always;
        try_files $uri =404;
    }

"""

marker = '    # ===== Node.js backend (admin, API, fallback) ====='

if calendar_block in content:
    print("[SKIP] /calendar/ block already exists in nginx config")
elif marker in content:
    content = content.replace(marker, calendar_block + marker)
    with open(path, 'w') as f:
        f.write(content)
    print("[OK] Nginx config updated — /calendar/ block added")
else:
    print("[ERROR] Could not find insertion marker in nginx config")
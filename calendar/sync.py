#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GNZ48 Team G 公演日历同步脚本
读取 schedule.json → 直接生成 team_g.ics (不依赖 ics 库序列化)

用法:
    python3 sync.py

部署:
    17 2 * * * /usr/bin/python3 /www/wwwroot/47.118.28.27/calendar/sync.py >> /var/log/gnz48_sync.log 2>&1
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone

# ── 配置 ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEDULE_FILE = os.path.join(BASE_DIR, "schedule.json")
OUTPUT_FILE = os.path.join(BASE_DIR, "team_g.ics")
TZ_CST = timezone(timedelta(hours=8))  # Asia/Shanghai UTC+8
DOMAIN = "shadowquake.top"


def load_schedule():
    """从 JSON 文件加载公演排班数据"""
    if not os.path.exists(SCHEDULE_FILE):
        print("[ERROR] 排班数据文件不存在: {}".format(SCHEDULE_FILE))
        return []

    with open(SCHEDULE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("[INFO] 已加载 {} 场公演排班数据".format(len(data)))
    return data


def escape_ics_text(text):
    """转义 ICS 文本中的特殊字符: \\ , ; 换行"""
    text = text.replace("\\", "\\\\")   # 反斜杠转义必须在最前
    text = text.replace(";", "\\;")
    text = text.replace(",", "\\,")
    text = text.replace("\n", "\\n")    # 真实换行 → ICS \n
    return text


def build_ics(shows):
    """直接手写 ICS 文件内容，完全掌控格式"""

    lines = []
    lines.append("BEGIN:VCALENDAR")
    lines.append("VERSION:2.0")
    lines.append("PRODID:-//GNZ48 Team G//Theater Show Calendar//CN")
    lines.append("CALSCALE:GREGORIAN")
    lines.append("METHOD:PUBLISH")
    lines.append("X-WR-CALNAME:GNZ48 Team G 公演日历")
    lines.append("X-WR-CALDESC:GNZ48 Team G 剧场公演安排 - shadowquake.top")
    lines.append("X-WR-TIMEZONE:Asia/Shanghai")

    now_utc = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    for show in shows:
        # 解析北京时间
        dt_str = "{} {}:00".format(show["date"], show["time"])
        begin_local = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
        begin_local = begin_local.replace(tzinfo=TZ_CST)
        end_local = begin_local + timedelta(hours=2, minutes=30)

        # 转 UTC 时间
        dtstart = begin_local.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        dtend = end_local.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

        # 构建描述文本 — 用真实换行，最后统一转义
        desc_raw = "\n".join([
            "公演：《{}》".format(show["stage"]),
            "类型：{}".format(show["type"]),
            "成员阵容：{}".format("、".join(show["cast"])),
            "备注特企：{}".format(show["note"]),
            "购票通道：https://m.gnz48.com/tickets/detail/{}".format(show["ticketId"]),
            "订阅来源：https://{}/gnz48.html".format(DOMAIN),
        ])
        desc = escape_ics_text(desc_raw)

        location = escape_ics_text(show["location"])
        summary = escape_ics_text("[GNZ48] {}".format(show["title"]))
        uid = "teamg-{}-2026@shadowquake.top".format(show["id"])

        lines.append("BEGIN:VEVENT")
        lines.append("UID:{}".format(uid))
        lines.append("DTSTAMP:{}".format(now_utc))
        lines.append("DTSTART:{}".format(dtstart))
        lines.append("DTEND:{}".format(dtend))
        lines.append("SUMMARY:{}".format(summary))
        lines.append("DESCRIPTION:{}".format(desc))
        lines.append("LOCATION:{}".format(location))
        lines.append("URL:https://m.gnz48.com/tickets/detail/{}".format(show["ticketId"]))
        # 提前 2 小时提醒
        lines.append("BEGIN:VALARM")
        lines.append("TRIGGER:-PT2H")
        lines.append("ACTION:DISPLAY")
        lines.append("DESCRIPTION:公演即将开场！准备好应援棒吧！")
        lines.append("END:VALARM")
        lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")

    # ICS 要求 CRLF 换行
    ics_text = "\r\n".join(lines) + "\r\n"

    with open(OUTPUT_FILE, "w", encoding="utf-8", newline="") as f:
        f.write(ics_text)

    file_size = os.path.getsize(OUTPUT_FILE)
    print("[OK] 日历文件已写入: {} ({} bytes)".format(OUTPUT_FILE, file_size))
    return ics_text


def main():
    print("[START] GNZ48 Team G 日历同步 — {} CST".format(
        datetime.now(TZ_CST).strftime("%Y-%m-%d %H:%M:%S")))

    shows = load_schedule()
    if not shows:
        print("[ABORT] 无数据，退出")
        sys.exit(1)

    build_ics(shows)

    # 输出订阅链接
    print("[DONE] 订阅地址: https://{}/calendar/team_g.ics".format(DOMAIN))
    print("        iPhone: 设置 → 日历 → 账户 → 添加账户 → 其他 → 添加已订阅的日历")
    print("        Android: 谷歌日历 → 设置 → 添加日历 → 通过网址")


if __name__ == "__main__":
    main()
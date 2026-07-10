#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GNZ48 Team G 公演日历同步脚本
读取 schedule.json → 生成 team_g.ics

用法:
    python3 sync.py

部署:
    17 2 * * * /usr/bin/python3 /www/wwwroot/47.118.28.27/calendar/sync.py >> /var/log/gnz48_sync.log 2>&1
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from ics import Calendar, Event

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


def build_calendar(shows):
    """将公演数据转换成 iCalendar 对象（CST 时区）"""
    cal = Calendar(creator="GNZ48 Team G AutoSync - shadowquake.top")

    # Python 3.6 不支持 f-string 内反斜杠，用变量代替
    nl = "\n"

    for show in shows:
        event = Event()
        event.name = "[GNZ48] {}".format(show["title"])

        # 解析北京时间 (CST UTC+8)，显式带上时区
        dt_str = "{} {}:00".format(show["date"], show["time"])
        begin_naive = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
        begin = begin_naive.replace(tzinfo=TZ_CST)

        # 结束时间 = 开始 + 2.5 小时
        end = begin + timedelta(hours=2, minutes=30)

        event.begin = begin
        event.end = end

        # 描述信息 — ICS 换行用 \n（单反斜杠）
        event.description = (
            "公演：《{}》\\n".format(show["stage"]) +
            "类型：{}\\n".format(show["type"]) +
            "成员阵容：{}\\n".format("、".join(show["cast"])) +
            "备注特企：{}\\n".format(show["note"]) +
            "购票通道：https://m.gnz48.com/tickets/detail/{}\\n".format(show["ticketId"]) +
            "订阅来源：https://{}/gnz48.html".format(DOMAIN)
        )

        event.location = show["location"]
        event.url = "https://m.gnz48.com/tickets/detail/{}".format(show["ticketId"])

        cal.events.add(event)

    print("[INFO] 已生成 {} 个 iCalendar 事件".format(len(cal.events)))
    return cal


def write_ics_with_alarms(cal):
    """写出 .ics 文件，并手动注入 VALARM + 修正 PRODID"""

    # 序列化日历
    ics_text = cal.serialize()

    # 替换 ics 库的默认 PRODID
    ics_text = ics_text.replace(
        "PRODID:ics.py - http://git.io/lLljaA",
        "PRODID:-//GNZ48 Team G//Theater Show Calendar//CN"
    )

    # 在每个 VEVENT 末尾插入 VALARM（END:VEVENT 之前）
    alarm_block = (
        "BEGIN:VALARM\r\n"
        "TRIGGER:-PT2H\r\n"
        "ACTION:DISPLAY\r\n"
        "DESCRIPTION:公演即将开场！准备好应援棒吧！\r\n"
        "END:VALARM\r\n"
    )

    ics_text = ics_text.replace("\r\nEND:VEVENT", "\r\n" + alarm_block + "END:VEVENT")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(ics_text)

    file_size = os.path.getsize(OUTPUT_FILE)
    print("[OK] 日历文件已写入: {} ({} bytes)".format(OUTPUT_FILE, file_size))


def main():
    print("[START] GNZ48 Team G 日历同步 — {} CST".format(
        datetime.now(TZ_CST).strftime("%Y-%m-%d %H:%M:%S")))

    shows = load_schedule()
    if not shows:
        print("[ABORT] 无数据，退出")
        sys.exit(1)

    cal = build_calendar(shows)
    write_ics_with_alarms(cal)

    # 输出订阅链接
    print("[DONE] 订阅地址: https://{}/calendar/team_g.ics".format(DOMAIN))
    print("        iPhone: 设置 → 日历 → 账户 → 添加账户 → 其他 → 添加已订阅的日历")
    print("        Android: 谷歌日历 → 设置 → 添加日历 → 通过网址")


if __name__ == "__main__":
    main()
---
title: "买了云服务器不知道干嘛？从个人博客到 Docker 全家桶的进阶路线"
date: "2025-12-08"
category: "技术"
author: "Thoi"
tags: ["服务器", "自托管", "Docker", "指南", "进阶"]
excerpt: "很多人买了云服务器，装了宝塔面板，搭了个 WordPress，然后就不知道还能干什么了。其实一台 24 小时在线的 Linux 服务器能做的事远超你的想象——从私有云盘到密码管理器，从自动化签到大全套到远程开发环境。本文是一张服务器玩法的全景地图。"
readTime: 6
coverImage: "https://images.unsplash.com/photo-1558494949-ef2a0de422d0?auto=format&fit=crop&q=80&w=1000"
---

> **TL;DR**：服务器不只是用来搭博客的。装上 Docker，它可以是你的私人网盘、密码管理器、自动化管家、远程开发机。本文按难度分级，帮你从零到一玩转云服务器。

---

## 第一阶段：建站（你已经会了）

如果你已经看过前几篇教程，下面这些你应该都搞定了：

- ✅ 用宝塔面板搭了 WordPress 博客
- ✅ 配了 SSL 证书，网站有小绿锁
- ✅ 会放行端口了

好，现在进入第二阶段。

---

## 第二阶段：把服务器变成"个人数据中心"

这些应用装一个就回不去了。

### 私有云盘：告别网盘限速

| 软件 | 一句话介绍 | 适合谁 |
|------|-----------|--------|
| **Nextcloud** | 开源的 Google Drive / iCloud | 想完全掌控数据的家庭用户 |
| **Alist** | 把阿里云盘/百度网盘/OneDrive 挂载成本地盘 | 不想付会员费的网盘重度用户 |
| **Seafile** | 比 Nextcloud 更轻量的文件同步 | 只需要文件同步，不需要协同办公 |

Alist 特别推荐——挂载后你可以在电脑/手机上像浏览本地文件夹一样访问所有网盘，还能直接在线播视频，不用下载客户端。

### 密码管理器：密码存自己家

```bash
docker run -d --name vaultwarden \
  -v /opt/vw-data:/data \
  -p 8088:80 \
  vaultwarden/server:latest
```

**Vaultwarden** 是 Bitwarden 的轻量实现。所有密码加密存储在你的服务器上，不经过任何第三方。配合浏览器插件和手机 App，体验跟 1Password 一样流畅，但免费且私密。

### 网站监控：挂了第一个知道

```bash
docker run -d --name uptime-kuma \
  -p 3001:3001 \
  louislam/uptime-kuma
```

**Uptime Kuma** 是一个漂亮的监控面板。添加你的所有网站 URL，它会每分钟 ping 一次。网站挂了？Telegram/微信/邮件立刻通知你。比用户先发现故障。

---

## 第三阶段：Docker 全家桶

如果你还没装 Docker，现在装：

```bash
curl -fsSL https://get.docker.com | bash
```

然后装个可视化管理面板：

```bash
docker run -d --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  portainer/portainer-ce
```

访问 `https://你的IP:9443`，以后所有 Docker 操作都可以在网页上完成。

> 💡 **装完 Docker 第一件事**：装 Portainer。它能让你在网页上看到所有容器的状态、日志、资源占用，比命令行直观 100 倍。

---

## 第四阶段：自动化和开发环境

### VS Code Remote：iPad 也能写代码

用 VS Code 的 `Remote - SSH` 插件连上服务器：

- 代码运行在服务器上，不消耗本地 CPU/内存
- 用 iPad + 蓝牙键盘在星巴克远程开发
- 环境永远一致，不会出现"我电脑上能跑"的问题

### 青龙面板：自动化管家

详见[青龙面板教程](/posts/2025-12-08-qinglong-panel-guide)：

- 京东/美团/B站 自动签到
- 定时运行 Python/JS 脚本
- 消息推送到微信/Telegram

### 海外服务器专属玩法

如果你的 VPS 在境外（香港/美国/日本），它天然拥有优质的国际网络：

- 加速访问 GitHub、Docker Hub
- 搭建合规代理服务用于学习和科研
- 详见：[阿里云轻量服务器搭建美国原生IP环境指南](/posts/2025-12-08-alibaba-cloud-us-ip)

---

## 日常维护速查

```bash
free -h          # 内存还剩多少
df -h            # 磁盘还剩多少
htop             # 谁在吃 CPU（需 apt install htop）
docker ps        # 哪些容器在跑
docker stats     # 每个容器吃了多少资源
netstat -tunlp   # 哪些端口在监听
```

---

## 推荐部署顺序

如果你是新手，建议按这个顺序来，不会信息过载：

1. **宝塔面板** → 先有个图形化操作的基础
2. **WordPress 博客** → 第一个"作品"
3. **Alist** → 感受 Docker 的便利
4. **Uptime Kuma** → 学会监控
5. **Vaultwarden** → 开始信任自托管
6. **青龙面板** → 玩转自动化
7. **你自己的创意** → 服务器在手，天下我有

---

## 总结

一台 24 小时在线的服务器是你的数字基地。从最初"搭个博客玩玩"，到后来"密码自己管、网盘自己建、监控自己搭、脚本自己跑"，你会越来越信任这台小机器。而 Docker 让这一切变得前所未有的简单。

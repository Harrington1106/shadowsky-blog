---
title: "云服务器除了搭博客，还能拿来干什么"
date: "2025-12-08"
category: "技术"
author: "Thoi"
tags: ["服务器","自托管","Docker","指南","进阶"]
excerpt: "不少人买了服务器，装上宝塔搭个 WordPress，然后就闲置了。一台 24 小时在线的机器能做的事不止建站：私有网盘、密码管理器、网站监控、远程开发环境。这篇按难度排了一条推荐路线。"
lastModified: "2026-08-03"
readTime: 5
coverImage: "/uploads/covers/a794b4ce.webp"
---

服务器闲置是很常见的事：搭完博客之后就不知道还能装什么了。

这篇按难度从低到高列一遍常见玩法。前面几项是建站相关的基础，如果你已经会了可以直接跳到第二节。

## 一、建站

看过前几篇教程的话，这些应该都做完了：用宝塔面板搭起 WordPress、配好 SSL 证书、会在云控制台放行端口。

这一步的价值不只是有了个网站，更是熟悉了「服务在服务器上跑、通过端口对外提供访问」这套模型。后面所有东西都是这个模式。

## 二、把服务器当数据中心

这一节的几个应用，装上之后基本就撤不掉了。

### 私有网盘

| 软件 | 定位 | 适合谁 |
|------|------|--------|
| Nextcloud | 开源的 Google Drive / iCloud | 想完全掌控数据的家庭用户 |
| Alist | 把阿里云盘、百度网盘、OneDrive 挂载成本地盘 | 网盘重度用户 |
| Seafile | 比 Nextcloud 轻量的文件同步 | 只要同步，不需要协同办公 |

三个里我最推荐 Alist。挂载之后，在电脑和手机上浏览各家网盘就像浏览本地文件夹，还能直接在线播视频，不用装一堆客户端。

### 密码管理器

```bash
docker run -d --name vaultwarden \
  -v /opt/vw-data:/data \
  -p 8088:80 \
  vaultwarden/server:latest
```

Vaultwarden 是 Bitwarden 的轻量实现。密码加密存在自己的服务器上，不经过第三方。配合官方的浏览器插件和手机 App 使用，体验和 1Password 接近。

### 网站监控

```bash
docker run -d --name uptime-kuma \
  -p 3001:3001 \
  louislam/uptime-kuma
```

Uptime Kuma 会按设定的间隔去 ping 你添加的每个 URL，挂了就往 Telegram、微信或邮箱发通知。装了它之后，故障基本能在用户反馈之前就发现。

## 三、Docker 与可视化管理

还没装 Docker 的话，先装：

```bash
curl -fsSL https://get.docker.com | bash
```

紧接着装一个 Portainer：

```bash
docker run -d --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  portainer/portainer-ce
```

访问 `https://你的IP:9443`，之后容器的状态、日志、资源占用都能在网页上看，起容器和删容器也不用再记命令。这是装完 Docker 之后最值得马上做的一件事。

## 四、自动化与开发环境

### 远程开发

用 VS Code 的 Remote - SSH 插件连上服务器，代码就跑在服务器上：

- 不占用本地 CPU 和内存
- 换设备不用重配环境，iPad 加个蓝牙键盘也能写
- 开发和线上是同一套环境，少掉一类「我这儿能跑」的问题

### 定时任务

见[青龙面板教程](/post/2025-12-08-qinglong-panel-guide)。签到、定时跑 Python 或 JS 脚本、结果推送到微信和 Telegram，都在它的范围内。

### 境外服务器的额外用途

如果 VPS 在香港、美国或日本，它天然有比较好的国际网络。常见用途是加速访问 GitHub 和 Docker Hub，以及搭建代理服务用于学习和科研。相关配置见[阿里云轻量服务器搭建美国原生 IP 环境](/post/2025-12-08-alibaba-cloud-us-ip)。

## 日常维护速查

```bash
free -h          # 内存还剩多少
df -h            # 磁盘还剩多少
htop             # 谁在吃 CPU，需要先 apt install htop
docker ps        # 哪些容器在跑
docker stats     # 每个容器占了多少资源
netstat -tunlp   # 哪些端口在监听
```

## 推荐顺序

一次装太多容易信息过载，建议按这个顺序来：

1. 宝塔面板，先有一个图形化的操作基础
2. WordPress 博客，第一个跑起来的东西
3. Alist，第一次感受 Docker 的便利
4. Uptime Kuma，学会监控
5. Vaultwarden，开始把重要数据交给自己的机器
6. 青龙面板，进入自动化

## 小结

从「搭个博客玩玩」到「密码自己管、网盘自己建、监控自己搭」，这个过程里真正变化的不是服务器，是你愿意托付给它的东西越来越多。

Docker 是让这件事变简单的关键——大部分服务现在都只是一条 `docker run`。

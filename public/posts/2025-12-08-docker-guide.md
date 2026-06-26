---
title: "Docker 入门指南：从此告别「在我电脑上能跑啊」"
date: "2025-12-08"
category: "技术"
author: "Thoi"
tags: ["Docker", "容器", "运维", "服务器", "教程"]
excerpt: "装个 WordPress 要配 PHP + MySQL + Nginx，中间随便哪步报错就得 Google 半天。Docker 把这一切打包成一个镜像，一行命令搞定，删掉也干干净净。本文带你从零理解 Docker 是什么、怎么用、为什么它是服务器上最伟大的发明。"
lastModified: "2026-06-26"
readTime: 4
coverImage: "https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&q=80&w=1000"
---

> **TL;DR**：Docker = 手机应用商店。想装 Jellyfin？`docker run jellyfin/jellyfin`，3 秒搞定。不想用了？`docker rm -f jellyfin`，服务器干干净净。没有依赖冲突，没有环境报错，换服务器直接打包带走。

---

## 安装软件：从"痛苦"到"一句话"

没有 Docker 的时候，在服务器上装个 WordPress 的流程是这样的：

1. 装 PHP（版本要对，扩展要全）
2. 装 MySQL（改密码、设权限、调编码）
3. 装 Nginx（写反代规则、配 SSL）
4. 中间任何一步报错 → Google → StackOverflow → 凌晨三点还没睡

**有了 Docker 之后：**

```bash
docker run -d --name wp -p 80:80 wordpress
```

这一行命令做了什么？Docker 从云端拉下来一个打包好的"镜像"，里面 PHP、MySQL、Nginx、配置文件全齐了。**开箱即用，环境零报错。**

---

## 环境隔离：每个软件住单间

以前装软件，各种配置文件散落在 `/etc`、`/var`、`/usr` 各个角落。卸载？永远删不干净。

更头疼的是软件打架——软件 A 要 PHP 7.4，软件 B 要 PHP 8.2，你装哪个？

Docker 的解法：**容器 = 独立房间**。

- 每个软件跑在自己的容器里，互不干涉
- 你要 5 个不同版本的 PHP？开 5 个容器，各用各的
- 不想用了？`docker rm -f 容器名`，服务器回到安装前的状态，零残留

> 💡 **实用技巧**：装新软件之前先用 `docker ps` 看看跑了哪些容器，用 `docker stats` 实时监控 CPU 和内存占用。

---

## Docker Hub：300 万个现成的宝藏

[Docker Hub](https://hub.docker.com) 是 Docker 官方的镜像仓库，类似手机上的 App Store。想装什么，搜一下就有。

### 影音娱乐

| 软件 | 能干什么 | 安装命令 |
|------|----------|----------|
| **Jellyfin** | 私人影院，手机/电视都能看 | `docker run -d jellyfin/jellyfin` |
| **Plex** | 比 Jellyfin 更华丽的媒体中心 | `docker run -d plexinc/pms-docker` |
| **Navidrome** | 自建 Spotify，随时随地听歌 | `docker run -d deluan/navidrome` |

### 生产力工具

| 软件 | 能干什么 |
|------|----------|
| **Bitwarden** | 自建密码管理器，密码存在自己服务器上 |
| **Uptime Kuma** | 监控所有网站在线状态，挂了立刻通知你 |
| **Nginx Proxy Manager** | 图形化管理域名、SSL 证书、反向代理 |
| **Nextcloud** | 自建 Dropbox，文件/日历/联系人全掌握 |
| **PhotoPrism** | AI 自动分类照片，Google Photos 的开源替代 |

### 下载与存储

| 软件 | 能干什么 |
|------|----------|
| **qBittorrent** | BT 下载器，Web 界面远程管理 |
| **Transmission** | 轻量 BT 下载 |
| **Alist** | 挂载阿里云盘/百度网盘/OneDrive 到本地 |

> ⚠️ **安全提醒**：Docker Hub 上的镜像谁都能上传，拉取前看一眼下载量和更新日期，别用 3 年没更新的冷门镜像。

---

## 迁移服务器：打包带走，一切如初

换了新 VPS？以前你需要：
1. 重装所有软件
2. 一个一个搬配置文件
3. 祈祷别出问题

**用 Docker 的正确姿势：**

```bash
# 老服务器上：导出数据卷
docker run --rm -v wp_data:/data alpine tar czf - -C /data . > backup.tar.gz

# 新服务器上：导入
docker run --rm -v wp_data:/data alpine tar xzf - -C /data < backup.tar.gz

# 启动容器
docker run -d --name wp -v wp_data:/var/lib/mysql -p 80:80 wordpress
```

连数据库登录状态都在，跟没搬过一样。

---

## 常用命令速查

```bash
docker ps                  # 看看哪些容器在跑
docker ps -a               # 包括已停止的
docker images               # 本地有哪些镜像
docker logs 容器名           # 看日志（排查问题第一步）
docker exec -it 容器名 bash  # 进入容器内部
docker-compose up -d        # 一键启动多容器应用
docker system prune -a      # 清理所有没用的镜像和容器（慎用）
```

---

## 总结

Docker 把服务器软件安装变成了"下载 App → 打开"这么简单。它解决的不只是安装问题，更是**环境一致性**问题：开发环境、测试环境、生产环境完全一致，再也没有"我这能跑啊"的尴尬。

学 Docker 不需要成为 DevOps 专家。先会用 `docker run`、`docker ps`、`docker rm` 这三个命令，你就已经超越了 80% 的服务器小白。剩下的，边用边学。

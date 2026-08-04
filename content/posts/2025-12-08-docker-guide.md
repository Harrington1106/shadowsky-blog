---
title: "Docker 入门：把装软件变成一行命令"
date: "2025-12-08"
category: "技术"
author: "Thoi"
tags: ["Docker","容器","运维","服务器","教程"]
excerpt: "在服务器上装 WordPress，得先配好 PHP、MySQL、Nginx，中间任何一步出错都要查上半天。Docker 把这些连同环境一起打包成镜像，一行命令装好，删掉也不留残渣。"
lastModified: "2026-08-03"
readTime: 5
coverImage: "/uploads/covers/8f590be8.webp"
---

Docker 是一种把软件连同它的运行环境一起打包的工具。打包出来的东西叫镜像（image），跑起来之后叫容器（container）。

对个人服务器来说，它的好处很直接：装一个服务不用再自己配依赖，卸载也不会留下一堆残留。想装 Jellyfin，`docker run jellyfin/jellyfin` 就行；不想要了，`docker rm -f jellyfin`，服务器回到装之前的样子。

下面分四件具体的事来说。

## 一、装软件

没有 Docker 的时候，在服务器上装 WordPress 大致是这个流程：

1. 装 PHP，版本要对，扩展要全
2. 装 MySQL，改密码、设权限、调编码
3. 装 Nginx，写反代规则、配 SSL
4. 中间任何一步报错，就去 Google 和 StackOverflow 里翻

用 Docker 只需要一条命令：

```bash
docker run -d --name wp -p 80:80 wordpress
```

Docker 会从云端拉下一个打包好的镜像，PHP、MySQL、Nginx 和配置文件都在里面，拉完就能用。

## 二、环境隔离

传统方式装软件，配置文件散落在 `/etc`、`/var`、`/usr` 各处，卸载常常删不干净。

更麻烦的是依赖打架：软件 A 要 PHP 7.4，软件 B 要 PHP 8.2，同一台机器上你只能装一个。

容器解决的就是这件事。每个软件跑在自己的容器里，各带各的依赖，互不干涉。需要五个不同版本的 PHP，就开五个容器。不想用了，`docker rm -f 容器名`，宿主机上不留痕迹。

日常有两个命令值得记住：`docker ps` 看当前跑着哪些容器，`docker stats` 实时看它们占了多少 CPU 和内存。

## 三、Docker Hub

[Docker Hub](https://hub.docker.com) 是官方的镜像仓库，想装什么先来这里搜。下面是几类常见的选择。

### 影音

| 软件 | 用途 | 安装命令 |
|------|------|----------|
| Jellyfin | 私人影院，手机和电视都能看 | `docker run -d jellyfin/jellyfin` |
| Plex | 界面比 Jellyfin 精致的媒体中心 | `docker run -d plexinc/pms-docker` |
| Navidrome | 自建音乐流媒体服务 | `docker run -d deluan/navidrome` |

### 生产力

| 软件 | 用途 |
|------|------|
| Bitwarden | 自建密码管理器，密码存在自己服务器上 |
| Uptime Kuma | 监控网站在线状态，挂了立刻通知 |
| Nginx Proxy Manager | 图形化管理域名、SSL 证书和反向代理 |
| Nextcloud | 自建网盘，文件、日历、联系人一起管 |
| PhotoPrism | 照片自动分类，Google Photos 的开源替代 |

### 下载与存储

| 软件 | 用途 |
|------|------|
| qBittorrent | BT 下载器，带 Web 界面，可远程管理 |
| Transmission | 更轻量的 BT 下载器 |
| Alist | 把阿里云盘、百度网盘、OneDrive 挂载到本地 |

拉镜像之前建议看一眼下载量和最近更新日期。Docker Hub 上谁都能上传，三年没更新的冷门镜像不要用。

## 四、迁移服务器

换新 VPS 时，传统做法是把软件重装一遍，再一个个搬配置文件。用 Docker 的话，把数据卷搬过去就够了：

```bash
# 老服务器：导出数据卷
docker run --rm -v wp_data:/data alpine tar czf - -C /data . > backup.tar.gz

# 新服务器：导入
docker run --rm -v wp_data:/data alpine tar xzf - -C /data < backup.tar.gz

# 启动容器
docker run -d --name wp -v wp_data:/var/lib/mysql -p 80:80 wordpress
```

数据卷带过去，连数据库里的登录状态都还在，跟没搬过一样。

## 常用命令

```bash
docker ps                    # 看看哪些容器在跑
docker ps -a                 # 包括已经停掉的
docker images                # 本地有哪些镜像
docker logs 容器名            # 看日志，排查问题的第一步
docker exec -it 容器名 bash   # 进入容器内部
docker compose up -d         # 一键启动多容器应用
docker system prune -a       # 清理没用的镜像和容器，慎用
```

## 小结

Docker 解决的不只是安装麻烦，更是环境一致性：本地、测试和线上跑的是同一个镜像，不会再出现「我这儿明明是好的」。

上手不需要先学完整套 DevOps。`docker run`、`docker ps`、`docker rm` 这三个命令够应付大部分日常，剩下的边用边查。

---
title: "自建全自动追番：AutoBangumi + qBittorrent + Jellyfin"
date: "2025-12-08"
category: "技术"
author: "Thoi"
tags: ["自托管","Jellyfin","AutoBangumi","番剧"]
excerpt: "番剧版权分散在各个平台，画面还有删减和调色。这篇用 AutoBangumi 订阅 RSS、qBittorrent 下载、Jellyfin 刮削展示，搭一套配置一次就能一直自动更新的追番系统。"
lastModified: "2026-08-03"
readTime: 7
coverImage: "/uploads/covers/6d1a2a4d.webp"
---

在线看番有两个绕不开的问题：版权分散在不同平台，想追齐一季得开好几个会员；画面还常有删减和调色。

如果手上有一台服务器或 NAS，可以把这件事自己接管过来。配置一次之后，系统会自动订阅、下载、重命名、刮削海报，你只需要打开播放器。

## 整套流水线

四个组件各管一段：

1. **Mikan Project（蜜柑计划）**：提供番剧的 RSS 订阅源
2. **AutoBangumi**：订阅 RSS，解析番剧信息，指挥下载器，并把下载完的文件重命名成标准格式
3. **qBittorrent**：实际下载
4. **Jellyfin / Emby / Plex**：展示海报墙，提供各平台播放

## 准备工作

- 服务器一台，云服务器（带宽尽量大一些）或者家里的 NAS、旧电脑都行
- 存储空间 50G 起步，具体看你想存多少
- 已经装好 Docker 和 Docker Compose

## 第一步：部署 AutoBangumi 和 qBittorrent

用 Docker Compose 一次把两个服务拉起来。Jellyfin 建议单独部署，或者直接装在本地设备上，这里只讲后端下载这部分。

### 创建文件夹

```bash
mkdir bangumi
cd bangumi
```

### 创建配置文件

用 `nano` 编辑器新建文件：

```bash
nano docker-compose.yml
```

进入编辑器界面后，复制下面这段，在终端里点鼠标右键粘贴：

```yaml
version: "3"
services:
  # 自动追番管理器
  autobangumi:
    image: estrellaxd/autobangumi:latest
    container_name: autobangumi
    restart: always
    ports:
      - "7892:7892"
    volumes:
      - ./auto_config:/config
      - ./data:/data
    environment:
      - TZ=Asia/Shanghai
      - PUID=1000
      - PGID=1000
      - UMASK=022
    depends_on:
      - qbittorrent

  # 下载器
  qbittorrent:
    image: linuxserver/qbittorrent:latest
    container_name: qbittorrent
    restart: always
    ports:
      - "8080:8080" # WebUI 端口
      - "6881:6881"
      - "6881:6881/udp"
    volumes:
      - ./qb_config:/config
      - ./data:/downloads # 注意：这里要和 autobangumi 映射同一个目录
    environment:
      - TZ=Asia/Shanghai
      - WEBUI_PORT=8080
```

两个容器的 `./data` 必须映射到同一个目录，否则 AutoBangumi 找不到 qBittorrent 下好的文件。

### 保存退出

依次按 `Ctrl + X`、`Y`、`Enter`。

### 启动

```bash
docker-compose up -d
```

## 第二步：配置 qBittorrent

1. 浏览器访问 `http://你的IP:8080`
2. 默认账号 `admin`，密码 `adminadmin`。新版本可能是随机生成的，用 `docker logs qbittorrent` 查看
3. 进入「设置 → Web UI」，改语言为中文，顺手把默认密码改掉
4. 进入「下载」，确认保存路径是容器内的 `/downloads`

第 4 步别跳过，路径不对后面整条链路都不通。

## 第三步：配置 AutoBangumi

1. 浏览器访问 `http://你的IP:7892`
2. 默认账号 `admin`，密码 `adminadmin`
3. 在左侧设置里找到下载器设置，按下面填：
   - Host：`qbittorrent`，两个容器在同一个 Docker 网络里，直接用服务名就行
   - Port：`8080`
   - Username / Password：填你刚才在 qBittorrent 里设的
4. 点「测试连接」，通过之后保存

## 第四步：添加订阅

1. 打开 [Mikan Project](https://mikanani.me/)，注册账号
2. 把想追的当季新番点「订阅」
3. 在首页点「RSS 订阅」图标，复制你的专属 RSS 链接
4. 回到 AutoBangumi，点「添加订阅」，粘贴链接，确定

之后 AutoBangumi 会解析 RSS 里的番剧，在 qBittorrent 里建好分类任务。下载完成后自动重命名成标准格式：

```text
Downloads/Anime/鬼灭之刃/Season 1/S01E01.mp4
```

这个命名格式是给刮削器看的，下一步 Jellyfin 能不能正确识别就取决于它。

## 第五步：对接 Jellyfin

1. 在 Jellyfin 里添加媒体库
2. 类型选「节目（Shows）」
3. 文件夹指向前面挂载的 `./data/Anime`
4. 打开刮削器，海报、简介和演员表会自动补上

## 第六步：从自己的网站访问

### 方式一：加一个导航链接

最省事的做法，在网站导航栏或侧边栏放一个跳转按钮：

```html
<a href="http://你的服务器IP:8096" target="_blank" class="btn-anime">
  进入追番中心
</a>
```

### 方式二：反向代理加域名

不想每次都敲 `IP:端口` 的话，用 Nginx Proxy Manager 映射到域名：

1. 买一个域名
2. 加一条 A 记录，主机记录填 `bangumi`，记录值填服务器 IP
3. 在 Nginx Proxy Manager 里 Add Proxy Host：
   - Domain Names：`bangumi.example.com`
   - Forward Hostname / IP：容器名，或者 Docker 网关 IP `172.17.0.1`
   - Forward Port：`8096`，Jellyfin 的端口
4. 勾上 Force SSL 和 HTTP/2，申请免费证书

之后访问 `https://bangumi.example.com` 就行。

## 小结

整条链路是这样跑的：每周新番更新，Mikan 的 RSS 跟着更新，AutoBangumi 抓到之后交给 qBittorrent 下载，下完自动重命名，Jellyfin 刮削出海报。

配置阶段最容易出错的是路径：两个容器的数据目录必须一致，qBittorrent 的保存路径必须是 `/downloads`。这两处对了，剩下的基本不用管。

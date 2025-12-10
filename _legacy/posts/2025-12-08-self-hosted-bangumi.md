# 打造最强私人追番中心：AutoBangumi + Jellyfin 全自动追番教程

还在忍受视频网站的“圣光”、“暗牧”和超长广告？还在因为番剧版权分散在不同平台而烦恼？
是时候利用你的服务器，搭建一套属于自己的全自动追番系统了！

只需配置一次，系统就会自动订阅、下载、整理、刮削海报，你只需要躺在沙发上打开电视/手机，直接观看最新一集的 4K 高画质新番。

## 系统架构图

我们的“追番流水线”由以下几个核心组件构成：

1.  **资源站 (Mikan Project)**: 提供番剧的 RSS 订阅源。
2.  **AutoBangumi**: 大脑。负责订阅 RSS，解析番剧信息，指挥下载器下载，并自动重命名文件。
3.  **qBittorrent**: 苦力。负责高速下载番剧资源。
4.  **Jellyfin / Emby / Plex**: 门面。负责展示精美的海报墙，提供全平台的播放服务。

## 准备工作

*   **服务器**: 一台云服务器（建议带宽较大）或家里的 NAS/旧电脑。
*   **存储空间**: 至少 50G 以上，取决于你想存多少番剧。
*   **Docker 环境**: 确保已安装 Docker 和 Docker Compose。

---

## 第一步：一键部署 (Docker Compose)

为了简化操作，我们将使用 Docker Compose 一次性启动 AutoBangumi 和 qBittorrent。
(Jellyfin 建议单独部署或直接安装在本地设备上，这里主要讲后端下载部分)

**1. 创建文件夹**

在终端中输入以下命令，创建一个名为 `bangumi` 的文件夹并进入：

```bash
mkdir bangumi
cd bangumi
```

**2. 创建并编辑配置文件**

我们将使用 `nano` 编辑器来创建文件（这对新手最友好）。输入：

```bash
nano docker-compose.yml
```

此时你会进入一个黑色的编辑器界面。请**复制**下面的全部代码，然后在终端里点击**鼠标右键**进行粘贴：

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

**3. 保存并退出**

粘贴完成后，请按键盘上的操作保存文件：
1.  按 `Ctrl + X` (尝试退出)
2.  按 `Y` (确认保存修改)
3.  按 `Enter` (确认文件名)

**4. 启动服务**

回到命令行界面后，运行以下命令启动服务：
```bash
docker-compose up -d
```

---

## 第二步：配置 qBittorrent

1.  打开浏览器访问 `http://你的IP:8080`。
2.  默认账号 `admin`，默认密码 `adminadmin` (新版可能随机生成，请查看 docker logs)。
3.  进入 **设置 (Options)** -> **Web UI**，建议修改语言为中文，并修改默认密码。
4.  **关键步骤**：进入 **下载 (Downloads)**，确保保存路径为 `/downloads` (容器内路径)。

---

## 第三步：配置 AutoBangumi

1.  打开浏览器访问 `http://你的IP:7892`。
2.  默认账号 `admin`，密码 `adminadmin`。
3.  **连接下载器**：
    *   点击左侧设置，找到下载器设置。
    *   **Host**: `qbittorrent` (因为在同一个 docker 网络下，直接用服务名即可)
    *   **Port**: `8080`
    *   **Username/Password**: 填你刚才在 qBittorrent 设置的。
    *   点击“测试连接”，成功后保存。

---

## 第四步：开始追番！

配置完成后，最激动人心的时刻来了。

1.  打开 [Mikan Project](https://mikanani.me/) (蜜柑计划)。
2.  注册一个账号，把你喜欢的当季新番点击“订阅”。
3.  在 Mikan 首页点击 **“RSS订阅”** 图标，复制你的专属 RSS 链接。
4.  回到 **AutoBangumi** 面板：
    *   点击 **“添加订阅”**。
    *   粘贴刚才的 RSS 链接。
    *   点击确定。

**奇迹发生了！**
AutoBangumi 会自动分析 RSS 里的番剧，自动在 qBittorrent 里创建分类任务。
下载完成后，它会自动把文件重命名为标准格式：
`Downloads/Anime/鬼灭之刃/Season 1/S01E01.mp4`

---

## 第五步：对接媒体服务器 (Jellyfin)

最后，安装 Jellyfin (或者 Emby/Plex)。

1.  在 Jellyfin 中添加媒体库。
2.  选择类型为 **“节目 (Shows)”**。
3.  文件夹选择刚才挂载的 `./data/Anime` 目录。
4.  开启刮削器，Jellyfin 会自动下载精美的海报、简介和演员表。

---

## 第六步：在自己的网站接入 (Web Integration)

搭建好服务后，如何优雅地从你的个人网站（比如你的博客）访问它呢？

### 方式一：添加导航链接（最简单）

你可以在网站的导航栏或侧边栏添加一个直接跳转的按钮。

**HTML 代码示例：**
```html
<a href="http://你的服务器IP:8096" target="_blank" class="btn-anime">
  📺 进入私人追番中心
</a>
```

### 方式二：反向代理 + 域名访问（推荐）

如果你不想每次都输入 `IP:端口`，可以使用 **Nginx Proxy Manager** (在上一篇服务器玩法大全中提到过) 将服务映射到一个域名。

1.  **购买域名**：阿里云/腾讯云购买一个域名（如 `example.com`）。
2.  **DNS 解析**：添加一条 `A` 记录，主机记录填 `bangumi`，记录值填你的服务器 IP。
3.  **Nginx Proxy Manager 设置**：
    *   Add Proxy Host
    *   Domain Names: `bangumi.example.com`
    *   Forward Hostname / IP: `qbittorrent` (容器名) 或 `172.17.0.1` (Docker网关IP)
    *   Forward Port: `8096` (Jellyfin端口)
4.  **SSL**: 勾选 `Force SSL` 和 `HTTP/2`，申请免费证书。

现在，你就可以直接访问 `https://bangumi.example.com` 来追番了！看起来就像 Bilibili 一样专业。

## 总结

现在，你拥有了一个全自动的追番中心：
*   每周新番更新 -> Mikan 更新 RSS -> AutoBangumi 抓取 -> qBittorrent 下载 -> 自动重命名 -> Jellyfin 刮削展示。

你所要做的，只是准备好爆米花，享受这一刻！

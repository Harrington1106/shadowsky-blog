---
title: "PicGo 图床配置：安装、联动编辑器、插件进阶"
date: "2025-12-08"
category: "效率工具"
author: "Thoi"
tags: ["PicGo","教程","Markdown","生产力","工具"]
excerpt: "Markdown 写作绕不开的问题是图片存哪。这篇记录 PicGo 的完整配置：GitHub 图床、Typora 与 Obsidian 联动，以及重命名、压缩、水印三个插件的具体参数，最后是 PicList 的迁移建议。"
lastModified: "2026-08-03"
readTime: 6
coverImage: "/uploads/covers/2d0f4bcb.webp"
---

用 Markdown 写作，早晚会撞上同一个问题：图片放哪。

存本地，文件发给别人图就裂了。手动传到某个网站再回来贴链接，思路每次都断一下。

图床工具就是来接这一步的，PicGo 是其中用得最广的一个。它做的事很简单：你复制或截一张图，它自动传到云端，再把 Markdown 链接塞回编辑器，中间不需要你操作。

下面分两部分：先把基础配置打通（安装、图床、编辑器联动），再讲插件（重命名、压缩、水印）和 PicList。

## 一、基础配置

### 下载与安装

PicGo 开源免费，从 [Molunerfinn/PicGo](https://github.com/Molunerfinn/PicGo/releases) 下载。Windows 取 `.exe`，Mac 取 `.dmg`。

### 选一个图床

PicGo 本身只是上传工具，图片实际存放的地方叫图床。常见的三类：

| 图床 | 情况 |
|------|------|
| SM.MS | 老牌免费，但这几年不太稳定，不建议当主力 |
| GitHub | 免费、稳，国内访问偶尔慢，需要配 CDN。新手够用 |
| 阿里云 OSS / 腾讯云 COS | 收费但极便宜（个人用一年几块钱），速度和稳定性都好，长期写作值得上 |

下面以 GitHub 为例，它免费而且通用。

#### 新建仓库

登录 GitHub，右上角 `+` → `New repository`。

- Repository name：随意，比如 `blog-images`
- **必须选 Public** —— 私有仓库别人看不到图片
- 点 `Create repository`

#### 获取 Token

头像 → `Settings` → 左侧最下方 `Developer settings` → `Personal access tokens` → `Tokens (classic)` → `Generate new token (classic)`。

- Note：随便填，比如 `picgo`
- Expiration：建议 `No expiration`，否则过期后上传会突然失败
- Select scopes：勾 `repo`（Full control of private repositories）
- 点 `Generate token`

⚠ 生成的那串字符**只显示一次**，当场复制下来。

#### 填进 PicGo

打开 PicGo → `图床设置` → `GitHub`：

- **设定仓库名**：`你的用户名/仓库名`，例如 `shadowsky/blog-images`
- **设定分支名**：`main`。老仓库是 `master`，去 GitHub 确认一下
- **设定 Token**：粘贴刚才那串
- **指定存储路径**：可选，填 `img/` 的话图片会进仓库的 img 文件夹
- **自定义域名**：不要留空用 GitHub 的 raw 链接，那个在国内很慢。填 jsDelivr：

    ```text
    https://cdn.jsdelivr.net/gh/用户名/仓库名@分支名
    ```

    例如 `https://cdn.jsdelivr.net/gh/shadowsky/blog-images@main`

最后点 `确定` 并 `设置为默认图床`。

### 联动写作软件

#### Typora

`文件` → `偏好设置` → `图像`：

1. 插入图片时：选 `上传图片`
2. 上传服务：选 `PicGo (app)`
3. 路径：指向你装 PicGo 的位置
4. 点 `验证图片上传选项`，成功会弹窗显示传上去的图

#### Obsidian

装插件 `Image auto upload Plugin`，启用后在插件设置里把默认上传器选成 `PicGo`。之后把图片拖进 Obsidian 就会自动走 PicGo。

## 二、插件进阶

用熟之后会冒出新需求：图片太大想压缩、怕被盗图想加水印、文件名乱七八糟想统一。这些都由插件解决。

### 怎么装插件

PicGo → `插件设置` → 搜插件名 → 安装。

装插件需要本机有 Node.js 环境，没有的话 PicGo 会提示。

### 自动重命名：picgo-plugin-rename-file

截图的默认文件名是 `截屏2025...png` 这种，重复冲突的概率不低。这个插件把文件名换成时间戳或哈希。

三种常用格式，直接填进插件的 Format 字段：

纯时间戳，文件名唯一且整齐：

```text
{y}{m}{d}{h}{i}{s}-{hash}
```

结果形如 `20251208123055-a1b2.png`。

按年月归档，会自动建出 `2025/12/` 的目录结构：

```text
{y}/{m}/{d}-{h}{i}{s}
```

结果是 `2025/12/08-123055.png`。

只要哈希，文件名最短：

```text
{hash}
```

结果形如 `a1b2c3d4.png`。

### 图片压缩：picgo-plugin-compress

一张截图动辄 2MB，网页加载慢、流量也跑得快。这个插件在上传前先压一道，基于 Tinypng 或其他引擎。

用 Tinypng 要去申请 API Key，免费额度是每月 500 张，填进插件配置即可。

### 图片水印：picgo-plugin-watermark

上传时自动在角落加文字或图片水印。

⚠ 两个坑，装完先看：

1. **装完必须点齿轮图标配置一遍并保存**，否则会报 `Cannot destructure property 'position'`
2. **字体路径必须填对**，否则中文水印会乱码或直接报错

#### 文字水印

在图片角落加一行字，参数如下：

| 字段 | 值 | 说明 |
|------|----|------|
| fontPath | `C:\Windows\Fonts\simhei.ttf` | 黑体，兼容性最好，绝大多数 Windows 都有 |
| | `C:\Windows\Fonts\arial.ttf` | 备选，但不支持中文 |
| | `/System/Library/Fonts/PingFang.ttc` | Mac |
| text | `@Thoi` | 换成你自己的 |
| color | `rgba(200,200,200,0.6)` | 半透明灰，不抢画面 |
| fontSize | `20` | |
| position | `rb` | Right-Bottom，右下角 |

#### 图片水印

用自己的 Logo 当水印：

- 水印图片路径：填本地 Logo 的绝对路径，例如 `D:\blog\logo.png`
- 水印位置：`rb`
- 水印透明度：`0.15`，若隐若现的程度比较合适

### PicList：PicGo 的增强分支

如果嫌 PicGo 更新慢、功能不够，可以换 [PicList](https://github.com/Kuingsmile/PicList)。它基于 PicGo 开发，界面几乎一样，多出来的是：

- **水印、压缩、重命名都内置**，不用装插件，也就少了一层出错的地方
- **能管理云端图片**，可以直接在软件里删云上的图（PicGo 只能传不能删）
- **图床支持更多**，原生支持 WebDAV、S3、兰空图床等

PicList 能直接导入 PicGo 的配置文件，深度用户迁过去成本很低。

## 常见问题

### 上传失败

1. 看 `设置` → `PicGo设置` → `Server` 端口是不是默认的 `36677`
2. 看文件名有没有空格、加号这类特殊字符，尽量用英文数字
3. GitHub 图床的话，确认 Token 没过期、网络能连通 GitHub

### GitHub 图床的图加载不出来

jsDelivr 的域名在国内偶尔会抽风。要稳定就换阿里云 OSS 或腾讯云 COS，配国内 CDN，速度和可用性都是另一个量级。

### 报错 `Cannot destructure property 'position'`

装了 `picgo-plugin-watermark` 但没配置它。打开 `插件设置` 找到 watermark，点右下角齿轮 → `配置插件`，随便填几个参数（比如 Position 选 `rb`）后点确定，重启 PicGo 即可。

---
title: "图床神器 PicGo 保姆级教程：从安装到进阶插件玩法"
date: "2025-12-08"
category: "效率工具"
author: "Thoi"
tags: ["PicGo", "教程", "Markdown", "生产力", "工具"]
excerpt: "写 Markdown 最头疼的就是图片去哪了？本文手把手教你配置 PicGo + Typora/Obsidian 工作流，更有水印、压缩、重命名等进阶插件玩法。"
readTime: 9
coverImage: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1000"
---

# 图床神器 PicGo 保姆级教程：从安装到进阶插件玩法

如果你开始尝试用 **Markdown** 写作，你一定会遇到一个痛点：**图片放哪？**

存本地？发给朋友时图片就裂了。
手动上传到网站再复制链接？太麻烦了，打断写作思路。

这时候，你需要一个**图床工具**。而 **PicGo**，就是这个领域的王者。

它能实现：**截图/复制图片 -> 自动上传到云端 -> 自动在编辑器里生成 Markdown 链接**。全程无需人工干预，写作体验如丝般顺滑。

本文将分两部分：
1.  **新手篇**：手把手教你安装配置，打通 Typora/Obsidian。
2.  **进阶篇**：插件玩法（压缩、水印、重命名）及 PicList 介绍。

---

## 第一部分：新手保姆级教程

### 1. 下载与安装

PicGo 是开源免费的。
*   **GitHub 下载**：[Molunerfinn/PicGo](https://github.com/Molunerfinn/PicGo/releases)
*   **选择版本**：Windows 用户下载 `.exe`，Mac 用户下载 `.dmg`。

### 2. 选择你的图床（仓库）

PicGo 只是一个上传工具，图片真正存放的地方叫“图床”。常见的有：

*   **SM.MS**：老牌免费图床，但这几年不太稳定，**不推荐作为主力**。
*   **GitHub**：免费，稳，但国内访问有时候慢（需配合 CDN）。**新手推荐**。
*   **阿里云 OSS / 腾讯云 COS**：收费（极其便宜，个人用一年几块钱），速度快，稳定。**长期写作者推荐**。

这里以 **GitHub** 为例，因为它是免费且通用的。

#### 配置 GitHub 图床步骤：

1.  **新建仓库**：
    *   登录 GitHub，点击右上角 `+` -> `New repository`。
    *   Repository name: 比如 `blog-images`。
    *   **Public**: 必须选公开，否则别人看不到图片。
    *   点击 `Create repository`。

2.  **获取 Token**：
    *   点击头像 -> `Settings` -> 左侧最下方 `Developer settings`。
    *   `Personal access tokens` -> `Tokens (classic)` -> `Generate new token (classic)`。
    *   Note: 随便填，比如 `picgo`。
    *   Expiration: 建议选 `No expiration`（永不过期）。
    *   **Select scopes**: 勾选 `repo` (Full control of private repositories)。
    *   点击 `Generate token`。**复制这串字符（只显示一次）！**

3.  **配置 PicGo**：
    *   打开 PicGo -> `图床设置` -> `GitHub`。
    *   **设定仓库名**：`你的用户名/仓库名`（例如 `shadowsky/blog-images`）。
    *   **设定分支名**：`main`（以前是 master，现在新仓库默认是 main，去 GitHub 确认一下）。
    *   **设定 Token**：粘贴刚才复制的那串字符。
    *   **指定存储路径**：可选，比如 `img/`，图片会存到仓库的 img 文件夹下。
    *   **自定义域名**：**关键点！** 为了加速，不要直接用 GitHub 的 raw 链接。
        *   格式：`https://cdn.jsdelivr.net/gh/用户名/仓库名@分支名`
        *   例如：`https://cdn.jsdelivr.net/gh/shadowsky/blog-images@main`
    *   点击 `确定` 并 `设置为默认图床`。

### 3. 联动写作软件

#### Typora 设置
1.  打开 Typora -> `文件` -> `偏好设置` -> `图像`。
2.  **插入图片时**：选择 `上传图片`。
3.  **上传服务**：选择 `PicGo (app)`。
4.  **路径**：选择你安装 PicGo 的路径。
5.  点击 `验证图片上传选项`，如果成功，会弹窗显示上传成功的图片。

#### Obsidian 设置
Obsidian 需要安装插件 `Image auto upload Plugin`。
1.  安装并启用该插件。
2.  在插件设置中，默认上传器选择 `PicGo`。
3.  现在你把图片拖进 Obsidian，它就会自动调用 PicGo 上传了。

---

## 第二部分：进阶玩法（让你的图床更强大）

当你用熟了 PicGo，你会发现一些新需求：图片太大想压缩？怕盗图想加水印？文件名乱七八糟想重命名？
这时候就需要 **PicGo 插件**了。

### 1. 如何安装插件？
打开 PicGo -> `插件设置` -> 搜索插件名 -> 点击安装。
*(注意：安装插件需要需安装 Node.js 环境，如果没有，PicGo 会提示)*

### 2. 必备插件推荐

#### A. 自动重命名：`picgo-plugin-rename-file`

**痛点**：截图默认文件名都是 `截屏2025...png`，容易重复冲突。
**功能**：自动把文件名改成 `时间戳` 或 `UUID`。

**配置作业（直接复制下方代码填入）：**

**方案 1：纯时间戳（最推荐）**
文件名唯一，清爽整齐。
```text
{y}{m}{d}{h}{i}{s}-{hash}
```
*效果：20251208123055-a1b2.png*

**方案 2：按年月归档（整理控必备）**
自动创建 `2025/12/` 这样的文件夹结构。
```text
{y}/{m}/{d}-{h}{i}{s}
```
*效果：自动创建 2025/12/ 文件夹，文件名为 08-123055.png*

**方案 3：极简哈希**
文件名最短。
```text
{hash}
```
*效果：a1b2c3d4.png*

#### B. 图片压缩：`picgo-plugin-compress`
**痛点**：一张截图 2MB，网页加载慢，流量跑得快。
**功能**：上传前自动压缩图片（基于 Tinypng 或其他引擎）。
**注意**：Tinypng 需要申请 API Key（免费版每月 500 张），配置进去即可。

#### C. 图片水印：`picgo-plugin-watermark`

**痛点**：辛辛苦苦写的文章被直接爬走，图都不换。
**功能**：上传时自动在角落添加文字或图片水印。

**⚠️ 避坑**：
1. 安装完**必须**点击齿轮图标进行配置，并点击“确定”保存，否则会报错 `Cannot destructure property 'position'`。
2. **字体路径必须正确**，否则中文会乱码或报错。

**配置作业（直接复制参数填入）：**

**方案 1：文字水印（推荐新手）**
直接在图片角落加上你的名字。
*   **字体文件路径**：*(必填，否则中文会乱码)*
    *   **推荐 (黑体)**: `C:\Windows\Fonts\simhei.ttf` (兼容性最好，绝大多数 Windows 都有)
    *   **备选 (Arial)**: `C:\Windows\Fonts\arial.ttf` (不支持中文，仅限英文水印)
    *   **Mac**: `/System/Library/Fonts/PingFang.ttc`
*   **水印文字**：`@Thoi` (换成你的名字)
*   **水印文字颜色**：`rgba(200, 200, 200, 0.6)` (高级灰半透明，不抢眼)
*   **字体大小**：`20`
*   **水印位置**：`rb` (Right-Bottom，右下角)

**配置作业（一键配置）：**
你可以直接复制下面的 JSON 配置，在 PicGo 的插件设置中找到 `Import Config` (如有) 或者手动对照填写。
由于 PicGo 插件界面通常是表单，这里提供标准填空参考：

1. **rename-file (重命名)**
   - Format: `{y}{m}{d}{h}{i}{s}-{hash}`

2. **watermark (水印)**
   - fontPath: `C:\Windows\Fonts\simhei.ttf`
   - text: `@YourName`
   - position: `rb`
   - fontSize: `20`
   - color: `rgba(200,200,200,0.6)`

**方案 2：图片水印（进阶）**
用你的 Logo 图片做水印。
*   **水印图片路径**：`D:\\blog\\logo.png` (填你本地 Logo 的绝对路径)
*   **水印位置**：`rb`
*   **水印透明度**：`0.15` (若隐若现最好)

### 3. 终极进阶：PicList —— PicGo 的超强魔改版

如果你觉得 PicGo 更新慢，功能不够多，强烈推荐 **PicList**。
它是基于 PicGo 开发的，界面几乎一样，但功能更强：

*   **内置了水印、压缩、重命名功能**（不需要装插件，更稳定）。
*   **支持管理云端图片**：你可以在软件里直接删除云端的图片（PicGo 只能上传不能删）。
*   **支持更多图床**：原生支持 WebDAV、S3、兰空图床等。

**迁移建议**：
PicList 可以直接导入 PicGo 的配置文件。如果你是深度用户，建议直接从 PicGo 迁移到 PicList。

---

## 常见问题 (FAQ)

**Q: 上传失败了怎么办？**
A:
1.  检查 PicGo `设置` -> `PicGo设置` -> `Server` 端口是否是 `36677`（默认）。
2.  检查文件名是否有特殊字符（空格、加号等），尽量用英文数字。
3.  如果是 GitHub，检查 Token 是否过期，或者网络是否能连通 GitHub。

**Q: GitHub 图床图片加载不出来？**
A: `jsDelivr` 域名在国内偶尔会抽风。如果追求极致稳定，建议花点小钱用 **阿里云 OSS** 或 **腾讯云 COS**，配合国内 CDN，速度飞快且稳如老狗。

**Q: 插件报错 `Cannot destructure property 'position' of 'config'`？**
A: 这是因为你安装了 `picgo-plugin-watermark` 水印插件但**没有配置它**。
**解决方法**：
1. 打开 `插件设置`，找到 watermark 插件。
2. 点击右下角 `齿轮` -> `配置插件`。
3. 随便填一些参数（比如 Position 选 `top-right`），然后点击 `确定`。
4. 重启 PicGo 即可。

---

希望这篇教程能帮你解决“图片焦虑”，让写作回归纯粹的内容创作！